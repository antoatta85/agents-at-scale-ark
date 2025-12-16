# Security Hardening Guide

This document describes the security hardening measures implemented in Ark based on the DataArt penetration testing report findings.

## Overview

Ark has been hardened to address all security findings from the penetration testing report:

| Finding | Severity | Status | Description |
|---------|----------|--------|-------------|
| M1 | Medium | ✅ Fixed | Clickjacking protection via security headers |
| L1 | Low | ✅ Fixed | Restricted overly permissive RBAC roles |
| L2 | Low | ✅ Fixed | Hardened container security parameters |
| L3 | Low | ✅ Fixed | Added comprehensive security headers |
| L4 | Low | ✅ Fixed | Configured TLS 1.2+ only |
| L5 | Low | ✅ Fixed | Configured strong cipher suites |

## Security Fixes Implemented

### M1 & L3: Security Headers (Clickjacking Protection)

**Issue**: Missing security headers allowed potential clickjacking attacks and other browser-based vulnerabilities.

**Fix**: Added comprehensive security headers to all Ingress configurations:

```yaml
annotations:
  nginx.ingress.kubernetes.io/configuration-snippet: |
    more_set_headers "X-Frame-Options: DENY";
    more_set_headers "Content-Security-Policy: frame-ancestors 'none'";
    more_set_headers "X-Content-Type-Options: nosniff";
    more_set_headers "X-XSS-Protection: 1; mode=block";
    more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains";
    more_set_headers "Referrer-Policy: strict-origin-when-cross-origin";
```

**Headers Explained**:
- **X-Frame-Options: DENY** - Prevents the page from being embedded in frames/iframes
- **Content-Security-Policy: frame-ancestors 'none'** - Modern alternative to X-Frame-Options
- **X-Content-Type-Options: nosniff** - Prevents MIME type sniffing
- **X-XSS-Protection: 1; mode=block** - Enables browser XSS protection
- **Strict-Transport-Security** - Forces HTTPS connections for 1 year
- **Referrer-Policy** - Controls referrer information sent with requests

**Affected Services**:
- `services/ark-api/chart/values.yaml`
- `services/ark-dashboard/chart/values.yaml`
- `services/ark-mcp/chart/values.yaml`

**Testing**:
```bash
# Verify headers are present
curl -I https://ark-api.example.com/
```

### L1: Restricted RBAC Roles

**Issue**: The `ark-deployer` ClusterRole had overly permissive delete permissions across the cluster.

**Fix**: Removed cluster-wide delete permissions from the `ark-deployer` role. The role can now:
- ✅ Create, update, and patch resources cluster-wide (for deployment)
- ✅ Read resources for verification and troubleshooting
- ❌ Delete resources cluster-wide (removed for safety)

Delete operations should be performed using namespace-scoped roles or explicit permissions.

**Changed File**:
- `ark/dist/chart/templates/rbac/ark-deployer-role.yaml`

**Rationale**:
- Deployment automation should be able to create and update resources
- Delete operations are typically manual administrative actions
- Restricting delete prevents accidental or malicious deletion of critical resources
- Follows principle of least privilege

**Migration**:
If your CI/CD pipeline requires delete permissions, create a separate role for cleanup operations:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ark-cleanup
  namespace: ark-system
rules:
- apiGroups: ["", "apps", "rbac.authorization.k8s.io"]
  resources: ["*"]
  verbs: ["delete"]
```

### L2: Container Security Hardening

**Issue**: Containers were running without security contexts, allowing potential privilege escalation.

**Fix**: Added comprehensive security contexts to all service deployments:

**Pod Security Context**:
```yaml
podSecurityContext:
  runAsNonRoot: true      # Prevent running as root
  runAsUser: 1000         # Run as specific non-root user
  fsGroup: 1000           # Set filesystem group ownership
  seccompProfile:
    type: RuntimeDefault  # Use default seccomp profile
```

**Container Security Context**:
```yaml
securityContext:
  allowPrivilegeEscalation: false  # Prevent privilege escalation
  readOnlyRootFilesystem: false    # Set to true if app allows
  capabilities:
    drop:
      - ALL                         # Drop all Linux capabilities
```

**Affected Services**:
- `services/ark-api/chart/values.yaml` + `templates/deployment.yaml`
- `services/ark-dashboard/chart/values.yaml` + `templates/deployment.yaml`
- `services/ark-mcp/chart/values.yaml` + `templates/deployment.yaml`
- `services/ark-evaluator/chart/values.yaml`
- `services/executor-langchain/chart/values.yaml`
- `services/ark-cluster-memory/chart/values.yaml`

**Note**: `readOnlyRootFilesystem` is set to `false` for services that require writable filesystem (FastAPI, Next.js). For enhanced security, consider making filesystems read-only and using emptyDir volumes for temporary files.

**Testing**:
```bash
# Verify pod security contexts
kubectl get pod -n ark-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.securityContext}{"\n"}{end}'

# Verify container security contexts
kubectl get pod -n ark-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].securityContext}{"\n"}{end}'
```

### L4 & L5: TLS Configuration

**Issue**: Missing TLS configuration allowed weak protocols and cipher suites.

**Fix**: Added TLS configuration to Gateway resources with:
- **TLS 1.2 and 1.3 only** (TLS 1.0 and 1.1 disabled)
- **Strong cipher suites** with forward secrecy
- **Server cipher preference** to ensure strongest ciphers are used

**Gateway Configuration**:
```yaml
tls:
  mode: Terminate
  certificateRefs:
    - name: tls-cert-secret
  options:
    nginx.org/ssl-protocols: "TLSv1.2 TLSv1.3"
    nginx.org/ssl-ciphers: "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384"
    nginx.org/ssl-prefer-server-ciphers: "on"
```

**Affected Files**:
- `services/localhost-gateway/chart/templates/gateway.yaml`
- `docs/security/TLS-CONFIGURATION.md` (comprehensive guide)

**Implementation**: The HTTPS listeners are commented out by default for localhost development. See [TLS-CONFIGURATION.md](./TLS-CONFIGURATION.md) for enablement instructions.

**Testing**:
```bash
# Verify TLS 1.2+ is supported
openssl s_client -connect ark-api.example.com:443 -tls1_2

# Verify TLS 1.0/1.1 are disabled
openssl s_client -connect ark-api.example.com:443 -tls1   # Should fail
openssl s_client -connect ark-api.example.com:443 -tls1_1 # Should fail

# Check cipher suites
nmap --script ssl-enum-ciphers -p 443 ark-api.example.com
```

## Deployment Checklist

When deploying Ark with these security fixes:

### Before Deployment

- [ ] Review and approve RBAC role changes
- [ ] Verify container images support running as non-root (UID 1000)
- [ ] Determine if TLS should be enabled for your environment
- [ ] Obtain or generate TLS certificates if enabling HTTPS

### During Deployment

- [ ] Deploy updated Helm charts
- [ ] Verify all pods start successfully with new security contexts
- [ ] Check that services are accessible with security headers
- [ ] If TLS enabled, verify certificate configuration

### After Deployment

- [ ] Test application functionality with hardened security
- [ ] Verify security headers are present in HTTP responses
- [ ] Test TLS configuration (if enabled)
- [ ] Review logs for any security-related errors
- [ ] Run security scanning tools to validate hardening

## Verification Commands

### Check Security Headers
```bash
# Test ark-api
curl -I http://ark-api.127.0.0.1.nip.io:8080/

# Test ark-dashboard
curl -I http://dashboard.127.0.0.1.nip.io:8080/
```

### Check Pod Security Contexts
```bash
# View all pod security contexts
kubectl get pods -n ark-system -o json | jq '.items[] | {name: .metadata.name, securityContext: .spec.securityContext}'

# View all container security contexts
kubectl get pods -n ark-system -o json | jq '.items[] | {name: .metadata.name, containers: [.spec.containers[] | {name: .name, securityContext: .securityContext}]}'
```

### Check RBAC Permissions
```bash
# View ark-deployer role
kubectl describe clusterrole ark-deployer

# Verify no delete verbs for sensitive resources
kubectl get clusterrole ark-deployer -o yaml | grep -A 5 "verbs:"
```

### Check TLS Configuration (if enabled)
```bash
# Test TLS handshake
openssl s_client -connect ark-api.example.com:443 -showcerts

# Check TLS version
openssl s_client -connect ark-api.example.com:443 -tls1_2 | grep Protocol

# List cipher suites
nmap --script ssl-enum-ciphers -p 443 ark-api.example.com
```

## Troubleshooting

### Pods Fail to Start (Security Context Issues)

**Symptom**: Pods crash or fail to start after applying security contexts.

**Common Causes**:
1. Container image requires root user
2. Application writes to read-only filesystem
3. Application requires specific Linux capabilities

**Solutions**:
```bash
# Check pod events
kubectl describe pod <pod-name> -n ark-system

# Check container logs
kubectl logs <pod-name> -n ark-system

# Temporarily relax security (testing only)
# Edit values.yaml and set:
podSecurityContext:
  runAsNonRoot: false  # Allow root temporarily
```

### Permission Denied Errors

**Symptom**: Application logs show "permission denied" errors.

**Cause**: Application trying to write to filesystem owned by root.

**Solution**: Ensure application writes to directories owned by fsGroup:
```yaml
volumeMounts:
  - name: tmp
    mountPath: /tmp
volumes:
  - name: tmp
    emptyDir: {}
```

### RBAC Permission Errors

**Symptom**: CI/CD pipeline fails with "forbidden" errors after RBAC changes.

**Solution**:
1. Review what resources the pipeline needs to delete
2. Create namespace-scoped Role for deletion operations
3. Update pipeline to use the scoped role

### Missing Security Headers

**Symptom**: Security headers not present in HTTP responses.

**Causes**:
1. Using HTTPRoute instead of Ingress (headers configured for Ingress only)
2. Ingress controller doesn't support `configuration-snippet`
3. Annotations not properly formatted

**Solution**:
```bash
# Check ingress configuration
kubectl describe ingress -n ark-system

# For HTTPRoute, configure headers in Gateway or use filters
# See TLS-CONFIGURATION.md for examples
```

## Security Scanning

Regular security scanning is recommended:

### Container Image Scanning
```bash
# Scan container images with Trivy
trivy image ghcr.io/mckinsey/agents-at-scale-ark/ark-api:latest

# Scan for high/critical vulnerabilities only
trivy image --severity HIGH,CRITICAL ghcr.io/mckinsey/agents-at-scale-ark/ark-api:latest
```

### Kubernetes Security Scanning
```bash
# Scan with kubesec
kubectl get pod -n ark-system -o json | kubesec scan -

# Scan with kube-bench
kube-bench run --targets node,policies
```

### Network Policy Scanning
```bash
# Check network policies exist
kubectl get networkpolicies -n ark-system

# Verify pod network isolation
kubectl describe networkpolicy -n ark-system
```

## Best Practices

1. **Regular Updates**: Keep all components updated to patch security vulnerabilities
2. **Least Privilege**: Grant minimum necessary permissions to service accounts
3. **Network Segmentation**: Use NetworkPolicies to restrict pod-to-pod communication
4. **Secret Management**: Use external secret management (Vault, AWS Secrets Manager)
5. **Audit Logging**: Enable Kubernetes audit logging for security events
6. **Monitoring**: Monitor for security anomalies (failed auth, privilege escalation)
7. **Backup**: Regular backups of critical data and configurations

## Compliance

These security fixes align with:
- **CIS Kubernetes Benchmark**: Container security best practices
- **OWASP Top 10**: Protection against common web vulnerabilities
- **NIST Guidelines**: Strong cryptography (TLS 1.2+, approved ciphers)
- **PCI DSS**: Security headers and TLS requirements

## References

- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/security-best-practices/)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [NIST TLS Guidelines](https://csrc.nist.gov/publications/detail/sp/800-52/rev-2/final)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)

## Support

For questions or issues related to these security fixes:
1. Review this documentation and [TLS-CONFIGURATION.md](./TLS-CONFIGURATION.md)
2. Check the troubleshooting section
3. Open an issue on the Ark GitHub repository
4. Contact the Ark security team

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-16 | 1.0 | Initial security hardening - All DataArt findings addressed |
