# Task: Query Resolution Architecture

Initial request: "Design a modular query resolution system for Ark that supports direct mode (Query CRD -> Controller -> QueryReconciler in-proc) and broker mode (POST /queries -> Broker -> QueryReconciler as service)"

## Status
Phase: Objectives (awaiting review)

## Plan
- [x] 01-objectives - Define why and goals
- [ ] 02-acceptance-criteria - Define "done" + verification methods
- [ ] 03-architecture - Design solution
- [ ] 04-verifiable-prototype - Build with checkpoints
- [ ] 05-verification - Prove each criterion with evidence
- [ ] 06-outcome - Document learnings

## Why This Task Matters

The query controller currently handles query resolution inline, with streaming fully supported via chat completion chunks sent to the broker, and OTEL events sent to both OTEL and the broker. This works well but tightly couples resolution logic to the controller.

We want to modularise query resolution to:
- Simplify the core controller
- Allow query reconciliation in-controller (simple setups)
- Allow query reconciliation via broker (scaling setups)

## Current Architecture

### Current State

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCERS                                        │
│         kubectl, ark cli, fark, ark dashboard, custom apps, etc...           │
└──────────────────────────────────────────────────────────────────────────────┘
           │                                                │
           ▼                                                ▼
  ┌─────────────────┐                              ┌─────────────────┐
  │   Query CRD     │◄─────────────────────────────│    ARK API      │
  │                 │                              │   /v1/queries   │
  └────────┬────────┘                              └─────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ARK CONTROLLER                                      │
│                                                                               │
│    ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│      QUERY CONTROLLER (tightly coupled)                                       │
│    │                                                                    │    │
│         - Agent loop (tool calls, inference)                                  │
│    │    - Memory ──────────────────────────────────────► Ark Broker    │    │
│         - LLM chunks ──────────────────────────────────► Ark Broker           │
│    │    - Query events ────────────► OTEL / K8s Events / Ark Broker    │    │
│                                                                               │
│    └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              ARK BROKER                                       │
│                                                                               │
│    - LLM completion chunks                                                    │
│    - Query events                                                             │
│    - OTEL traces                                                              │
│    - Memory / messages                                                        │
│    - Session events                                                           │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CONSUMERS                                        │
│         ark cli, fark, ark api, ark dashboard, custom apps, etc...           │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Hypothesised Architecture

### Step 1: Modularise QueryReconciler (in-controller)

Extract query resolution logic into a distinct `QueryReconciler` component within the controller.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          PRODUCERS (Unchanged)                                │
│         kubectl, ark cli, fark, ark dashboard, custom apps, etc...           │
└──────────────────────────────────────────────────────────────────────────────┘
           │                                                │
           ▼                                                ▼
  ┌─────────────────┐                              ┌─────────────────┐
  │   Query CRD     │◄─────────────────────────────│    ARK API      │
  │                 │                              │   /v1/queries   │
  └────────┬────────┘                              └─────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ARK CONTROLLER                                      │
│                                                                               │
│    ┌────────────────────────────────────────────────────────────────────┐    │
│    │                      QUERY RECONCILER                              │    │
│    │                                                                    │    │
│    │    - Agent loop (tool calls, inference)                           │    │
│    │    - Memory ──────────────────────────────────────► Ark Broker    │    │
│    │    - LLM chunks ──────────────────────────────────► Ark Broker    │    │
│    │    - Query events ────────────► OTEL / K8s Events / Ark Broker    │    │
│    │                                                                    │    │
│    └────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          ARK BROKER (Unchanged)                               │
│                                                                               │
│    - LLM completion chunks                                                    │
│    - Query events                                                             │
│    - OTEL traces                                                              │
│    - Memory / messages                                                        │
│    - Session events                                                           │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          CONSUMERS (Unchanged)                                │
│         ark cli, fark, ark api, ark dashboard, custom apps, etc...           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Query Mode vs Resolution Mode Matrix

Before extracting the QueryReconciler to a standalone service, we define the possible combinations:

```
┌─────────────────────┬─────────────────────────────┬─────────────────────────────┐
│                     │      RESOLUTION MODE        │      RESOLUTION MODE        │
│                     │      In-Controller          │      Standalone Service     │
├─────────────────────┼─────────────────────────────┼─────────────────────────────┤
│                     │                             │                             │
│  QUERY MODE         │  Query CRD created          │  Query CRD created          │
│  Direct             │  Controller runs            │  Controller publishes to    │
│  (via K8s)          │  QueryReconciler in-proc    │  broker, service processes  │
│                     │                             │                             │
│                     │  ► Current + Step 1         │  ► Step 2                   │
│                     │                             │                             │
├─────────────────────┼─────────────────────────────┼─────────────────────────────┤
│                     │                             │                             │
│  QUERY MODE         │  N/A                        │  POST to broker API         │
│  Broker             │  (no broker = no broker     │  Service processes          │
│  (via Broker API)   │   mode)                     │  Optionally create CRD      │
│                     │                             │                             │
│                     │                             │  ► Step 3                   │
│                     │                             │                             │
└─────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

**Direct + In-Controller** (Current + Step 1)
- Query CRD created in etcd
- Controller runs QueryReconciler in-proc
- Full K8s visibility (kubectl, events, status)

**Direct + Standalone** (Step 2)
- Query CRD created in etcd
- Controller forwards to broker, resolution offloaded to service
- Full K8s visibility, but resolution scales independently
- etcd still stores the query (same potential perf issues at scale)

**Broker + Standalone** (Step 3)
- POST to broker API or Ark API (with `reconciliation: broker`)
- No K8s CRD by default - bypasses etcd entirely
- Optionally request CRD creation (pass-through) for visibility
  - If CRD requested: etcd stores query, but resolution still offloaded
  - CRD becomes an "API over the broker" - visibility without blocking resolution
- Maximum scale: no etcd bottleneck when CRD skipped

### Step 2: Extract QueryReconciler to Service (Direct + Standalone)

QueryReconciler deployed as separate Go service. Controller publishes to broker, QueryReconciler subscribes and processes.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          PRODUCERS (Unchanged)                                │
│         kubectl, ark cli, fark, ark dashboard, custom apps, etc...           │
└──────────────────────────────────────────────────────────────────────────────┘
           │                                                │
           ▼                                                ▼
  ┌─────────────────┐                              ┌─────────────────┐
  │   Query CRD     │◄─────────────────────────────│    ARK API      │
  │                 │                              │   /v1/queries   │
  └────────┬────────┘                              └─────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         ARK CONTROLLER (thin)                                 │
│                                                                               │
│    - Watches Query CRDs                                                       │
│    - Publishes query to broker                                                │
│    - Subscribes to results, syncs status back to CRD                         │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              ARK BROKER (bus)                                 │
│                                                                               │
│    - Query routing (publish/subscribe)                                        │
│    - LLM completion chunks                                                    │
│    - Query events / OTEL traces                                               │
│    - Memory / messages                                                        │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ subscribe
                                     ▼
┌──────────────────────────────────────────────────┐  ┌──────────────────────┐
│           QUERY RECONCILER SERVICE (Go)          │  │  Future Reconcilers  │
│                                                  │  ├──────────────────────┤
│    - Same code as in-controller QueryReconciler  │  │ Responses Reconciler │
│    - Agent loop (tool calls, inference)          │  │ (chat completions)   │
│    - Memory integration                          │  ├──────────────────────┤
│    - Publishes results back to broker            │  │ Embeddings Reconciler│
│    - Horizontally scalable                       │  │ (vector generation)  │
│                                                  │  └──────────────────────┘
└──────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          CONSUMERS (Unchanged)                                │
│         ark cli, fark, ark api, ark dashboard, custom apps, etc...           │
└──────────────────────────────────────────────────────────────────────────────┘
```

> **Note:** This architecture opens the door for different types of query reconciliation in a modular fashion. Different reconcilers can subscribe to different topics on the broker, enabling specialised processing for chat completions, embeddings, evaluations, etc.

### Step 3: Direct Broker Mode (no CRD)

Users publish query objects directly to the broker, bypassing K8s entirely.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      DIRECT BROKER MODE                                       │
└──────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │  POST /queries  │
                    │  (HTTP client)  │
                    └────────┬────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            ARK BROKER (bus)                                   │
│                                                                               │
│    - Message routing                                                          │
│    - Completion chunks (SSE)                                                  │
│    - No K8s CRD created                                                       │
│                                                                               │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │
                │ subscribe
                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      QUERY RECONCILER SERVICE (Go)                            │
│                                                                               │
│    - Same code as in-controller QueryReconciler                               │
│    - Agent loop (tool calls, inference)                                       │
│    - Horizontally scalable                                                    │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Resolution Matrix

|  | **No Broker** | **Broker Installed** |
|--|---------------|----------------------|
| **Direct** | Controller runs QueryReconciler in-proc | Controller publishes to broker, QueryReconciler service processes |
| **Broker** | Error (no broker) | QueryReconciler service processes directly |

### No Broker + Direct
- Query CRD created via kubectl/API
- Controller runs QueryReconciler in-proc
- Result written to `status.response`
- **Current behavior, unchanged**

### No Broker + Broker Mode
- User requests broker mode but no broker installed
- Error returned to caller

### Broker Installed + Direct
- Query CRD created via kubectl/API
- Controller publishes query to broker
- QueryReconciler service subscribes and processes
- Controller syncs result back to `status.response`

### Broker Installed + Broker Mode
- POST to /queries (no CRD)
- Broker routes to QueryReconciler service
- Result streamed via SSE
- Optional: caller can request CRD creation

## Goals

### Primary Goals

1. **Extract QueryReconciler**: Modularise query resolution logic into a distinct Go component
2. **Define interfaces**: Clear contracts for QueryReconciler that work in-controller and as standalone service
3. **Design routing logic**: Controller detects mode and either runs in-proc or publishes to broker
4. **Design status sync**: Controller syncs results from broker back to CRD status
5. **Prototype**: Demonstrate the architecture with working code

### Non-Goals (Follow-on Work)

- Full production implementation with all edge cases
- Performance optimization and benchmarking
- Multi-cluster broker federation
- Migration tooling for existing queries

## Related Issues

| Issue | Description |
|-------|-------------|
| [#636](https://github.com/mckinsey/agents-at-scale-ark/issues/636) | RFC: Query Controller Scaling and Sharding |
| [#549](https://github.com/mckinsey/agents-at-scale-ark/issues/549) | Epic: Ark Broker - Streaming and Sessions |
| [#552](https://github.com/mckinsey/agents-at-scale-ark/issues/552) | feat: ark sessions |
| [#550](https://github.com/mckinsey/agents-at-scale-ark/issues/550) | fix: separate session id and conversation id |
| [#597](https://github.com/mckinsey/agents-at-scale-ark/pull/597) | feat: Pub/sub for session events and queries |

## Constraints

1. **Backward compatibility**: Direct mode must work exactly as today when broker is not installed
2. **No breaking API changes**: Existing Query CRDs must continue to work
3. **Shared Go code**: QueryReconciler is Go, enabling code reuse between controller and service
4. **Kubernetes-native**: Must respect K8s patterns for status updates and reconciliation

## Success Criteria

After this task:
- QueryReconciler is modularised and can run in-controller or as standalone service
- Controller can detect broker presence and route accordingly
- QueryReconciler service can process queries from broker
- Architecture decisions are captured with rationale
- Prototype demonstrates end-to-end flow in both modes
