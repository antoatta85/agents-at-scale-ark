---
owner: Ark Prototyping Agent
description: Prototype implementation plan for Ark Broker
---

# Ark Broker - Prototype Plan

## Goal

Verify data flows through the pipes, works realtime, and we can see what we're talking about.

## Plan

### Step 1: Rename ark-cluster-memory to ark-broker

Files to modify:
- `services/ark-cluster-memory/` -> `services/ark-broker/` (rename directory)
- `services/ark-broker/ark-cluster-memory/` -> `services/ark-broker/ark-broker/` (rename inner directory)
- `services/ark-broker/ark-broker/package.json` - update name
- `services/ark-broker/ark-broker/src/main.ts` - update service name
- `services/ark-broker/chart/Chart.yaml` - update chart name
- `services/ark-broker/chart/values.yaml` - update app name, image repository
- `services/ark-broker/chart/templates/*.yaml` - update references
- `services/ark-broker/devspace.yaml` - update references
- `services/ark-broker/build.mk` - update target names
- `devspace.yaml` (root) - update dependency path
- `.github/workflows/cicd.yaml` - update references

### Step 2: Add OTEL traces endpoint to ark-broker

Files to create/modify:
- `services/ark-broker/ark-broker/src/routes/traces.ts` - new route for OTLP traces
- `services/ark-broker/ark-broker/src/trace-store.ts` - new store for traces
- `services/ark-broker/ark-broker/src/server.ts` - mount traces router
- `services/ark-broker/ark-broker/src/types.ts` - add trace types

Key implementation:
- `POST /v1/traces` - receive OTLP JSON traces
- Store traces in memory (similar to stream-store pattern)
- Add event emitter for real-time subscriptions

### Step 3: Fork OTEL from controller to broker

Files to modify:
- `ark/internal/telemetry/config/provider.go` - add multi-exporter support

Key implementation:
- Add `ARK_BROKER_OTEL_ENDPOINT` environment variable
- Create a second OTLP exporter that sends to ark-broker
- Use OTEL `MultiSpanExporter` to send to both endpoints
- Keep existing OTEL flow unchanged (Langfuse, Phoenix, etc still work)

### Step 4: Add SSE streams for all topics

Files to modify:
- `services/ark-broker/ark-broker/src/routes/traces.ts` - add SSE endpoint
- `services/ark-broker/ark-broker/src/routes/stream.ts` - ensure SSE works
- `services/ark-broker/ark-broker/src/routes/memory.ts` - add SSE endpoint

SSE endpoints:
- `GET /v1/traces?watch=true` - real-time trace stream
- `GET /stream/{query_id}` - already exists (LLM chunks)
- `GET /messages?watch=true` - real-time message stream

### Step 5: Add experimental Broker feature flag (Dashboard)

Files to modify:
- `services/ark-dashboard/ark-dashboard/atoms/experimental-features.ts` - add broker atom
- `services/ark-dashboard/ark-dashboard/components/experimental-features-dialog/experimental-features.tsx` - add to feature list

### Step 6: Create Broker diagnostics page (Dashboard)

Files to create:
- `services/ark-dashboard/ark-dashboard/app/(dashboard)/broker/page.tsx` - main broker page with tabs

Files to modify:
- `services/ark-dashboard/ark-dashboard/lib/constants/dashboard-icons.ts` - add broker section
- `services/ark-dashboard/ark-dashboard/components/app-sidebar.tsx` - conditionally show broker nav

## Status

- [x] Create prototype plan document
- [ ] Rename ark-cluster-memory to ark-broker
- [ ] Add OTEL traces endpoint to ark-broker
- [ ] Fork OTEL from controller to broker
- [ ] Add SSE streams for traces, messages, chunks
- [ ] Add experimental Broker feature flag
- [ ] Create Broker diagnostics page in dashboard

## Implementation Notes

*To be updated as implementation progresses*

## Verification

### Prerequisites

```bash
# Start the cluster with devspace
devspace dev
```

### Step 1 Verification: Rename complete

```bash
# Verify the service starts
kubectl get pods -n ark | grep ark-broker

# Verify health endpoint
kubectl port-forward svc/ark-broker 8080:80 -n ark &
curl http://localhost:8080/health
# Expected: OK
```

### Step 2 Verification: OTEL traces endpoint works

```bash
# Send a test trace to the broker
curl -X POST http://localhost:8080/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "scopeSpans": [{
        "spans": [{
          "traceId": "test123",
          "spanId": "span456",
          "name": "test.span",
          "startTimeUnixNano": "1234567890000000000",
          "endTimeUnixNano": "1234567891000000000"
        }]
      }]
    }]
  }'
# Expected: 200 OK

# Retrieve traces
curl http://localhost:8080/v1/traces
# Expected: JSON with the test trace
```

### Step 3 Verification: Controller forks to broker

```bash
# Set the broker endpoint env var on controller
kubectl set env deployment/ark-controller \
  ARK_BROKER_OTEL_ENDPOINT=http://ark-broker.ark.svc.cluster.local:80/v1/traces \
  -n ark-system

# Create a test query
kubectl apply -f samples/queries/simple-query.yaml

# Check traces arrived at broker
curl http://localhost:8080/v1/traces
# Expected: Query-related spans visible
```

### Step 4 Verification: SSE streams work

```bash
# In terminal 1: Watch traces stream
curl -N "http://localhost:8080/v1/traces?watch=true"

# In terminal 2: Send a trace
curl -X POST http://localhost:8080/v1/traces ...
# Expected: Terminal 1 shows the trace in real-time
```

### Step 5-6 Verification: Dashboard shows Broker page

1. Open dashboard at http://ark-dashboard.127.0.0.1.nip.io
2. Go to Settings (cog icon) -> Experimental Features
3. Enable "Broker Diagnostics"
4. Verify "Broker" appears in the sidebar under Operations
5. Click on Broker page
6. Verify 3 tabs visible: "OTEL Traces", "Messages", "LLM Chunks"
7. Create a query and watch real-time data flow in each tab

---

## Checkpoint: Initial Plan

### Goal
Create implementation plan and verify understanding of the existing codebase.

### Verification
- [x] Read objectives and architecture docs
- [x] Understand ark-cluster-memory structure (TypeScript/Express service)
- [x] Understand controller OTEL telemetry (uses OTLP HTTP exporter)
- [x] Understand dashboard experimental features pattern (Jotai atoms with localStorage)
- [x] Create this prototype plan

### Results
*User to fill in after reviewing plan*

### Feedback
*User to fill in*

### Next Steps
Begin implementation with Step 1 (rename ark-cluster-memory to ark-broker)
