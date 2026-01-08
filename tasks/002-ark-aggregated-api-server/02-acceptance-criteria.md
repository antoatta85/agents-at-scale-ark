# Acceptance Criteria

> Stub - to be filled in after objectives are reviewed.

## Criteria

### API Server Functionality

| Criterion | Verification Method |
|-----------|---------------------|
| kubectl get/create/delete works | Manual test with all Ark resources |
| Controller reconciliation works | Run existing controller against new API server |
| RBAC enforced | Test with different service accounts |
| Namespaces respected | Create resources in different namespaces |
| Watch/informers work | Controller receives updates |

### Storage Backends

| Criterion | Verification Method |
|-----------|---------------------|
| SQLite backend works | Integration tests |
| PostgreSQL backend works | Integration tests |
| Backend is configurable via Helm | Deploy with different configs |

### Compatibility

| Criterion | Verification Method |
|-----------|---------------------|
| Existing controllers unchanged | No code changes to controllers |
| Webhooks fire correctly | Validation/mutation webhooks work |
| Helm install works | Install in fresh cluster |

### Standalone Mode

| Criterion | Verification Method |
|-----------|---------------------|
| Runs without K8s | Start ark-apiserver with SQLite locally |
| API accessible | curl against local endpoint |

## Definition of Done

1. All acceptance criteria verified
2. Documentation updated
3. Helm chart updated
4. CI tests pass
