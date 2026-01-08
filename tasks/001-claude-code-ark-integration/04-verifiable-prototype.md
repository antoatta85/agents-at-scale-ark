# Verifiable Prototype

Sequential verification steps for Claude Code A2A integration with Ark.

## Prerequisites

- Ark installed in cluster
- `ANTHROPIC_API_KEY` environment variable set
- `ark` or `fark` CLI available

## Step 1: Hello World

**Goal**: Deploy claude-code-agent and verify basic query execution.

```bash
# Install the chart with Anthropic key (requires v0.1.3+ for envFrom support)
helm install claude-code-agent oci://ghcr.io/dwmkerr/charts/claude-code-agent \
  --version ">=0.1.3" \
  --set apiKey=$ANTHROPIC_API_KEY

# Verify A2AServer and Agent created. Might take a couple of mins.
kubectl get a2aserver
kubectl get agent

# Query the agent
ark query agent/claude-code "What is 2 + 2?"
```

**Checkpoint 1:**
- [x] Helm install succeeds
- [x] A2AServer shows Ready
- [x] Agent CRD auto-created
- FAIL: Query returns correct response

Note: the failure is related to A2A message response accumulation. See [PR #579](https://github.com/mckinsey/agents-at-scale-ark/pull/579) for the fix.

## Step 2: OTEL Telemetry

**Goal**: Verify telemetry flows to configured backend.

Ark uses `otel-environment-variables` ConfigMap/Secret for OTEL configuration. Create it if not present:

```bash
# Check existing OTEL config
kubectl get configmap otel-environment-variables 2>/dev/null || echo "No OTEL ConfigMap"

# If needed, create OTEL config (example for Phoenix)
kubectl apply -f 99-resources/otel-configmap.yaml

# Upgrade chart to pick up OTEL config (requires envFrom in chart)
helm upgrade claude-code-agent oci://ghcr.io/dwmkerr/charts/claude-code-agent \
  --version ">=0.1.3" \
  --set apiKey=$ANTHROPIC_API_KEY

# Restart pod to pick up new env
kubectl rollout restart deployment/claude-code-agent

# Send a query to generate traces
ark query agent/claude-code-agent "Tell me about observability"

# Check agent logs for OTEL activity
kubectl logs -l app.kubernetes.io/name=claude-code-agent | grep -i otel
```

**Checkpoint 2:**
- [ ] OTEL ConfigMap/Secret exists in namespace
- [ ] Agent picks up OTEL environment variables
- [ ] Traces visible in backend (Phoenix/Langfuse/etc.)
- [ ] Spans include Claude model calls

## Step 3: MCP Servers

**Goal**: Configure MCP servers via Helm chart.

```bash
# Create MCP config
kubectl apply -f 99-resources/mcp-config.yaml

# Upgrade chart with MCP config reference
helm upgrade claude-code-agent oci://ghcr.io/dwmkerr/charts/claude-code-agent \
  --version ">=0.1.3" \
  --set apiKey=$ANTHROPIC_API_KEY \
  --set mcpConfig.existingSecret=mcp-config

# Restart pod
kubectl rollout restart deployment/claude-code-agent

# Verify MCP server loaded (check agent logs)
kubectl logs -l app.kubernetes.io/name=claude-code-agent | grep -i mcp

# Test MCP tool usage
ark query agent/claude-code-agent "Use the filesystem tool to list /tmp"
```

**Checkpoint 3:**
- [ ] MCP config mounted into container
- [ ] MCP server appears in agent logs at startup
- [ ] Agent can use MCP tools in queries

## Step 4: Skills Configuration

**Goal**: Configure Claude skills/agents via Helm chart.

```bash
# Create skills ConfigMap
kubectl apply -f 99-resources/skills-config.yaml

# Upgrade chart with skills mount
helm upgrade claude-code-agent oci://ghcr.io/dwmkerr/charts/claude-code-agent \
  --version ">=0.1.3" \
  --set apiKey=$ANTHROPIC_API_KEY \
  --set skills.existingConfigMap=skills-config

# Restart pod
kubectl rollout restart deployment/claude-code-agent

# Test skill invocation
ark query agent/claude-code-agent "Use the greeting skill to say hello"
```

**Checkpoint 4:**
- [ ] Skills mounted to `~/.claude/skills/`
- [ ] Skill appears in agent's available skills
- [ ] Skill can be invoked via query

## Verification Script

Quick verification for all steps:

```bash
#!/bin/bash
set -e

echo "=== Step 1: Hello World ==="
kubectl get pods -l app.kubernetes.io/name=claude-code-agent
kubectl get a2aserver
kubectl get agent
ark query agent/claude-code-agent "Say hello" | head -5

echo "=== Step 2: OTEL ==="
kubectl get configmap otel-environment-variables 2>/dev/null && echo "OTEL configured" || echo "No OTEL config"

echo "=== Step 3: MCP ==="
kubectl get secret mcp-config 2>/dev/null && echo "MCP configured" || echo "No MCP config"

echo "=== Step 4: Skills ==="
kubectl get configmap skills-config 2>/dev/null && echo "Skills configured" || echo "No skills config"

echo "=== Done ==="
```

## Resources

Installation resources are in `99-resources/`:
- `step1-install.sh` - Basic helm install
- `otel-configmap.yaml` - OTEL environment configuration
- `mcp-config.yaml` - MCP server configuration
- `skills-config.yaml` - Claude skills configuration

## Expected Outcome

After completing all steps:
1. Claude Code agent running in cluster
2. Queries execute via Ark API
3. OTEL traces flow to backend
4. MCP servers available for tool use
5. Skills configured and invocable
