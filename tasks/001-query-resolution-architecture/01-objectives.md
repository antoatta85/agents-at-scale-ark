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

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CURRENT STATE                                    │
└──────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   Query CRD     │
                    │   (kubectl)     │
                    └────────┬────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         QUERY CONTROLLER                                      │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    Query Resolution Logic                                │ │
│  │  - Target resolution                                                     │ │
│  │  - Agent/Team/Model/Tool execution                                       │ │
│  │  - Agentic loop (tool calls)                                            │ │
│  │  - Memory integration                                                    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└───────────────┬───────────────────────────────────┬───────────────────────────┘
                │                                   │
                ▼                                   ▼
┌───────────────────────────┐       ┌───────────────────────────┐
│        ARK BROKER         │       │          OTEL             │
│  - Completion chunks      │       │  - Trace spans            │
│  - Session events         │       │  - Metrics                │
│  - Messages               │       │                           │
└───────────────────────────┘       └───────────────────────────┘
```

## Hypothesised Architecture

### Step 1: Modularise QueryReconciler (in-controller)

Extract query resolution logic into a distinct `QueryReconciler` component within the controller.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      MODULARISED (IN-CONTROLLER)                              │
└──────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   Query CRD     │
                    └────────┬────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         QUERY CONTROLLER                                      │
│                                                                               │
│    ┌────────────────────────────────────────────────────────────────────┐    │
│    │                      QUERY RECONCILER                              │    │
│    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │    │
│    │  │   Target     │  │   Agent      │  │   Memory     │             │    │
│    │  │  Resolution  │  │   Loop       │  │ Integration  │             │    │
│    │  └──────────────┘  └──────────────┘  └──────────────┘             │    │
│    └────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
└───────────────┬───────────────────────────────────┬───────────────────────────┘
                │                                   │
                ▼                                   ▼
┌───────────────────────────┐       ┌───────────────────────────┐
│        ARK BROKER         │       │          OTEL             │
└───────────────────────────┘       └───────────────────────────┘
```

### Step 2: Extract QueryReconciler to Service (broker mode)

Controller offloads query resolution to the broker via the QueryReconciler service.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      EXTRACTED (BROKER MODE)                                  │
└──────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   Query CRD     │
                    └────────┬────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    QUERY CONTROLLER (thin)                                    │
│                                                                               │
│    - Watches Query CRDs                                                       │
│    - Forwards to broker                                                       │
│    - Syncs status back to CRD                                                │
│                                                                               │
└───────────────┬──────────────────────────────────────────────────────────────┘
                │
                │ forward query
                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            ARK BROKER                                         │
│                                                                               │
│    ┌────────────────────────────────────────────────────────────────────┐    │
│    │                      QUERY RECONCILER                              │    │
│    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │    │
│    │  │   Target     │  │   Agent      │  │   Memory     │             │    │
│    │  │  Resolution  │  │   Loop       │  │ Integration  │             │    │
│    │  └──────────────┘  └──────────────┘  └──────────────┘             │    │
│    └────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│    - Completion chunks (SSE)                                                  │
│    - Session management                                                       │
│    - Status sync to CRD                                                       │
│                                                                               │
└───────────────────────────────────────────────┬───────────────────────────────┘
                                                │
                                                ▼
                                ┌───────────────────────────┐
                                │          OTEL             │
                                └───────────────────────────┘
```

### Step 3: Direct Broker Mode (no CRD)

Users fire query objects directly into the broker, bypassing K8s entirely.

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
│                            ARK BROKER                                         │
│                                                                               │
│    ┌────────────────────────────────────────────────────────────────────┐    │
│    │                      QUERY RECONCILER                              │    │
│    └────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│    - No K8s CRD created                                                       │
│    - Result via SSE stream                                                    │
│    - Horizontal scaling                                                       │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Resolution Matrix

|  | **No Broker** | **Broker Installed** |
|--|---------------|----------------------|
| **Direct** | Controller runs QueryReconciler in-proc | Controller forwards to broker |
| **Broker** | Error (no broker) | Broker runs QueryReconciler directly |

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
- Controller forwards query to broker
- Broker runs QueryReconciler
- Controller syncs result back to `status.response`

### Broker Installed + Broker Mode
- POST to /queries (no CRD)
- Broker runs QueryReconciler
- Result streamed via SSE
- Optional: caller can request CRD creation

## Goals

### Primary Goals

1. **Extract QueryReconciler**: Modularise query resolution logic into a distinct component
2. **Define interfaces**: Clear contracts for QueryReconciler that work in-controller and in-broker
3. **Design routing logic**: Controller detects mode and either runs in-proc or forwards to broker
4. **Design status sync**: Broker updates CRD status when processing forwarded queries
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
3. **Kubernetes-native**: Must respect K8s patterns for status updates and reconciliation

## Success Criteria

After this task:
- QueryReconciler is modularised and can run in-controller or in-broker
- Controller can detect broker presence and route accordingly
- Broker can run QueryReconciler and sync status back to CRDs
- Architecture decisions are captured with rationale
- Prototype demonstrates end-to-end flow in both modes
