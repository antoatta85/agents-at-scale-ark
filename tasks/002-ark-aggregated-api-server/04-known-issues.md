# Known Issues

## WATCH Requests Timeout Through kube-apiserver Aggregation Proxy

### Status: Blocker for Controller Integration

### Problem

Watch requests to the ark-apiserver timeout immediately when proxied through the kube-apiserver's aggregation layer. This prevents the ark-controller from syncing its informer cache, causing the controller to fail to start.

**Error signature:**
```
E0109 16:11:45.873271 1 wrap.go:53] "Timeout or abort while handling" method="GET"
URI="/apis/ark.mckinsey.com/v1alpha1/agents?watch=true&..."
```

**Controller failure:**
```
"timed out waiting for cache to be synced for Kind *v1alpha1.Agent"
```

### Root Cause

This is a **known Kubernetes limitation** documented in [kubernetes/kubernetes#83200](https://github.com/kubernetes/kubernetes/issues/83200).

The kube-apiserver's `WithTimeoutForNonLongRunningRequests` filter wraps the aggregation proxy handler. This filter uses a `LongRunningFunc` to determine if a request should bypass the timeout. However, for aggregated APIs, the function doesn't correctly identify watch requests as long-running.

**Key finding:** Watch requests work correctly when connecting directly to ark-apiserver (bypassing kube-apiserver):

```bash
# Direct connection - WORKS
curl -sk "https://ark-apiserver.ark-system:443/apis/ark.mckinsey.com/v1alpha1/agents?watch=true"
# Returns: {"type":"BOOKMARK","object":{"kind":"Agent",...}}

# Through kube-apiserver - FAILS (immediate timeout)
curl -sk "https://kubernetes.default/apis/ark.mckinsey.com/v1alpha1/agents?watch=true"
# Returns: timeout at wrap.go:53
```

### What We Tried (Didn't Help)

1. **Extended kube-apiserver timeouts:**
   ```
   --request-timeout=3600s
   --min-request-timeout=3600
   ```
   These don't affect the aggregation proxy's timeout handling.

2. **LongRunningFunc on ark-apiserver:**
   ```go
   serverConfig.LongRunningFunc = func(...) bool { return true }
   ```
   This only affects our apiserver's own timeout, not the kube-apiserver proxy.

3. **Enabled/Disabled HTTP/2:**
   No effect on the timeout behavior.

4. **Immediate BOOKMARK responses:**
   Sending BOOKMARK events immediately doesn't help because the kube-apiserver timeout triggers before our response is even proxied.

### Proposed Solutions

#### Option A: Direct Client Connection (Recommended)

Configure the ark-controller to use a **separate Kubernetes client** that connects directly to the ark-apiserver service for Ark resources, bypassing the aggregation layer.

```
┌─────────────────────────────────────────────────────────────────┐
│                         ark-controller                           │
│                                                                  │
│  ┌──────────────────┐           ┌──────────────────┐            │
│  │ Core Resources   │           │ Ark Resources    │            │
│  │ (pods, secrets)  │           │ (agents, queries)│            │
│  └────────┬─────────┘           └────────┬─────────┘            │
│           │                              │                       │
│           ▼                              ▼                       │
│    kube-apiserver              ark-apiserver (direct)            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**
1. Create a custom `rest.Config` pointing to `ark-apiserver.ark-system.svc:443`
2. Use this config for informers watching Ark resources
3. Use standard kubeconfig for core Kubernetes resources

**Pros:**
- Works around the Kubernetes limitation
- Standard pattern for operators talking to external APIs
- No changes needed to kube-apiserver

**Cons:**
- More complex client configuration
- Need to handle service discovery/DNS
- TLS certificate management

#### Option B: Sidecar Proxy

Deploy a sidecar in the controller pod that proxies watch requests directly to ark-apiserver.

**Pros:**
- Transparent to controller code
- Can be configured via Helm

**Cons:**
- Additional complexity
- Another component to maintain

#### Option C: Wait for Kubernetes Fix

The upstream issue may eventually be addressed.

**Pros:**
- Clean solution

**Cons:**
- No timeline
- Issue has been open since 2019

### Is Direct Connection a Hack?

**No, it's a pragmatic architectural pattern.** Here's why:

1. **Common Pattern:** Many Kubernetes operators use direct connections to external APIs (databases, cloud providers, etc.)

2. **Service Mesh Precedent:** Istio, Linkerd, and other service meshes use direct connections for control plane communication

3. **Aggregated API Design:** The aggregated API pattern was designed for extending kubectl/RBAC, not necessarily for controller communication

4. **Performance:** Direct connection is actually more efficient (fewer hops)

The "hack" characterization would apply if we were:
- Patching kube-apiserver
- Using undocumented APIs
- Breaking Kubernetes contracts

Instead, we're simply having the controller talk directly to a service endpoint, which is standard Kubernetes networking.

### Recommended Approach

Implement **Option A (Direct Client Connection)** with:

1. A helper function to create the direct client
2. Feature flag to enable/disable (for testing)
3. Fallback to aggregated path if direct connection fails
4. Clear documentation

### References

- [kubernetes/kubernetes#83200](https://github.com/kubernetes/kubernetes/issues/83200) - Support long-running requests on aggregated apiservers
- [kubernetes/kubernetes#60042](https://github.com/kubernetes/kubernetes/issues/60042) - Concurrent watch limit for aggregated APIs
- [projectcalico/calico#7791](https://github.com/projectcalico/calico/issues/7791) - Similar issue with Calico's aggregated API
