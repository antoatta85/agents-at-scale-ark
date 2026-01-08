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

Ark currently executes queries synchronously within the controller. This works for small scale but limits horizontal scaling and prevents streaming responses. We need to extract query resolution into a reusable component that can run either in-process (direct) or as a separate service (broker).

## Current State

**Query Controller (`ark/internal/controller/query_controller.go`):**
- Handles Query CRD reconciliation
- `executeQueryAsync()` contains the resolution logic
- Tightly coupled to controller lifecycle
- No way to forward resolution to external service

**Agentic Loop (`ark/internal/genai/agent.go`):**
- `executeLocally()` runs the agent loop
- Used by both Query and Team controllers
- No streaming support for external callers

**Broker (`services/ark-broker/`):**
- TypeScript/Express service with append-only streams
- Handles sessions and streaming
- Cannot currently run QueryReconciler
- No status sync back to K8s CRDs

## Goals

### Primary Goals

1. **Extract QueryReconciler**: Create a reusable package from `executeQueryAsync()` that encapsulates query resolution logic
2. **Define interfaces**: Establish clear contracts between controller/broker and QueryReconciler
3. **Design routing logic**: Controller detects mode and either runs in-proc or forwards to broker
4. **Design status sync**: Broker updates CRD status when processing forwarded queries
5. **Prototype minimal changes**: Demonstrate the architecture with working code

### Non-Goals (Follow-on Work)

- Full production implementation with all edge cases
- Performance optimization and benchmarking
- Multi-cluster broker federation
- Complete streaming implementation
- Migration tooling for existing queries

## Related Issues

| Issue | Description |
|-------|-------------|
| [#636](https://github.com/mckinsey/agents-at-scale-ark/issues/636) | RFC: Query Controller Scaling and Sharding |
| [#549](https://github.com/mckinsey/agents-at-scale-ark/issues/549) | Epic: Ark Broker - Streaming and Sessions |
| [#552](https://github.com/mckinsey/agents-at-scale-ark/issues/552) | feat: ark sessions |
| [#550](https://github.com/mckinsey/agents-at-scale-ark/issues/550) | fix: separate session id and conversation id |
| [#597](https://github.com/mckinsey/agents-at-scale-ark/pull/597) | feat: Pub/sub for session events and queries |

## Research Available

| Topic | Artifact |
|-------|----------|
| Design document | `/Users/Dave_Kerr/repos/github/mckinsey/agents-at-scale-ark-query-resolution/query-resolution.md` |
| Current query controller | `ark/internal/controller/query_controller.go` |
| Current agent loop | `ark/internal/genai/agent.go` |
| Broker service | `services/ark-broker/` |

## Constraints

1. **Backward compatibility**: Direct mode must work exactly as today when broker is not installed
2. **No breaking API changes**: Existing Query CRDs must continue to work
3. **Go + TypeScript boundary**: QueryReconciler runs in Go; broker is TypeScript
4. **Kubernetes-native**: Must respect K8s patterns for status updates and reconciliation

## Success Criteria

After this task:
- QueryReconciler interface is defined and documented
- Controller can detect broker presence and route accordingly
- Broker can run QueryReconciler and sync status back to CRDs
- Architecture decisions are captured with rationale
- Prototype demonstrates end-to-end flow in both modes
