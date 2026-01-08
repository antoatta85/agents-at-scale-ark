# Acceptance Criteria

## Trust

How can we build trust in this process and these learnings?

- Acceptance criteria with verification method for each
- Architecture diagrams reviewed against related issues
- Working prototype demonstrates end-to-end flow in both modes

## Research Available

| Question | Answer | Artifact |
|----------|--------|----------|
| What modes are needed? | Direct (in-proc) and Broker (service) | `query-resolution.md` |
| Where is current logic? | `executeQueryAsync()` in query_controller.go | `ark/internal/controller/` |
| What is the broker? | TypeScript/Express with append-only streams | `services/ark-broker/` |

## Criteria

### Interface Design

| Criterion | Verification Method |
|-----------|---------------------|
| QueryReconciler interface is defined in Go | Code review: interface exists in `ark/internal/reconciler/` |
| Interface supports both sync and async execution | Interface has methods for both patterns |
| Controller can instantiate QueryReconciler | Unit test: controller creates reconciler |
| Broker can call QueryReconciler via gRPC/HTTP | Integration test: broker invokes reconciler |

### Mode Detection and Routing

| Criterion | Verification Method |
|-----------|---------------------|
| Controller detects broker presence | Unit test: mock broker discovery |
| Controller routes to broker when available and configured | Unit test: forward path triggered |
| Controller runs in-proc when broker unavailable | Unit test: direct path triggered |
| System config controls default mode | Config test: `defaultReconciliation` respected |
| System config can lock to single mode | Config test: `allowedModes` enforced |

### Status Synchronization

| Criterion | Verification Method |
|-----------|---------------------|
| Broker can update Query CRD status | Integration test: status field updated |
| Status updates preserve existing fields | Test: incremental update doesn't overwrite |
| Status sync handles broker restart | Test: recovery after broker crash |

### API Behavior

| Criterion | Verification Method |
|-----------|---------------------|
| Reading aggregates from all sources | API test: GET /queries returns both CRD and broker queries |
| Writing respects `reconciliation` field | API test: POST with each mode |
| Writing uses system default when field omitted | API test: POST without field uses config |
| Error returned when broker mode requested but unavailable | API test: 400/503 response |

### Code Quality

| Criterion | Verification Method |
|-----------|---------------------|
| Go code compiles without errors | `make build` succeeds |
| Go tests pass | `make test` succeeds |
| No hardcoded broker URLs | Code review |
| TypeScript compiles (broker changes) | `npm run build` succeeds |

## Out of Scope (Follow-on Tasks)

- Production-ready error handling and retries
- Metrics and observability
- Performance benchmarking
- Multi-cluster support
- Complete streaming implementation

## Definition of Done

1. QueryReconciler interface defined and documented
2. Controller routes queries based on configuration and broker availability
3. Broker can execute QueryReconciler and sync status to CRDs
4. Prototype demonstrates both modes working end-to-end
5. All acceptance criteria verified with evidence
