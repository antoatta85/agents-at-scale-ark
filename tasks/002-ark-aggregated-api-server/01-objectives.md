# Task: Ark Aggregated API Server

## Status
Phase: Complete

## Plan
- [x] 01-objectives - Define why and goals
- [x] 02-acceptance-criteria - Define "done" + verification methods
- [x] 03-architecture - Design solution
- [x] 04-prototype - Build proof of concept
- [x] 05-verification - Prove each criterion (E2E tests passing)
- [x] 06-outcome - PR #690 ready for merge

## Why This Task Matters

### Current State

Ark uses standard Kubernetes CRDs stored in etcd:

```
┌─────────────────────────────────────┐
│         Ark Resources               │
│                                     │
│  Agents, Models, Tools, Teams,      │
│  Queries, Memories, MCPServers,     │
│  Evaluations, ExecutionEngines      │
│                                     │
│              ALL → etcd             │
└─────────────────────────────────────┘
```

### The Problem

1. **etcd write limits**: ~10-20k writes/sec shared with entire cluster
2. **Queries are high-volume**: Each query = 3-4 etcd writes
3. **Cluster impact**: Ark load affects unrelated workloads (pod scheduling, etc.)
4. **Limited query capabilities**: No SQL, no full-text search, no complex filters

### The Solution

Ark implements a Kubernetes Aggregated API Server with pluggable storage:

```
┌─────────────────────────────────────┐
│         Ark Resources               │
│                                     │
│  Agents, Models, Tools, Teams,      │
│  Queries, Memories, MCPServers,     │
│  Evaluations, ExecutionEngines      │
│                                     │
│         ALL → Ark API Server        │
│                    │                │
│                    ▼                │
│         SQLite / PostgreSQL         │
└─────────────────────────────────────┘
```

## Goals

### Primary Goals

1. **Build Ark API Server** using apiserver-builder scaffolding
2. **Pluggable storage** supporting SQLite (dev) and PostgreSQL (prod)
3. **Full K8s compatibility** - kubectl, RBAC, controllers, webhooks all work
4. **Zero-config development** - SQLite embedded by default
5. **Standalone mode** - Run without Kubernetes

### Non-Goals (for this RFC)

- Migration tooling from existing CRD installations
- Cloud-specific storage backends (RDS, Cloud SQL)
- Performance benchmarking
- Multi-region replication

## Technical Approach

### 1. Scaffolding with apiserver-builder

```bash
go install sigs.k8s.io/apiserver-builder-alpha/cmd/apiserver-boot@v1.23.0

apiserver-boot init repo --domain ark.ai
apiserver-boot create group version resource --group ark --version v1alpha1 --kind Agent
apiserver-boot create group version resource --group ark --version v1alpha1 --kind Model
apiserver-boot create group version resource --group ark --version v1alpha1 --kind Query
# ... repeat for all resources
```

### 2. Storage Backend Interface

```go
type StorageBackend interface {
    Create(ctx context.Context, obj runtime.Object) error
    Get(ctx context.Context, name, namespace string) (runtime.Object, error)
    List(ctx context.Context, namespace string, opts ListOptions) ([]runtime.Object, error)
    Update(ctx context.Context, obj runtime.Object) error
    Delete(ctx context.Context, name, namespace string) error
    Watch(ctx context.Context, namespace string, opts WatchOptions) (WatchInterface, error)
}

// Implementations
type SQLiteBackend struct { db *sql.DB }
type PostgreSQLBackend struct { db *sql.DB }
```

### 3. Registration with Kubernetes

```yaml
apiVersion: apiregistration.k8s.io/v1
kind: APIService
metadata:
  name: v1alpha1.ark.ai
spec:
  group: ark.ai
  version: v1alpha1
  service:
    name: ark-apiserver
    namespace: ark-system
  groupPriorityMinimum: 1000
  versionPriority: 15
```

### 4. Helm Configuration

```yaml
# values.yaml
ark:
  apiserver:
    enabled: true
    replicas: 2

  storage:
    driver: sqlite  # sqlite, postgresql, mysql

    sqlite:
      path: /data/ark.db

    postgresql:
      host: ""
      port: 5432
      database: ark
      username: ark
      passwordSecret: ark-db-credentials
```

## Architecture Components

### New Components

| Component | Description |
|-----------|-------------|
| `ark-apiserver` | Aggregated API server handling all Ark resources |
| `storage` package | Pluggable storage backend interface |
| `sqlite` backend | SQLite implementation for dev/simple deployments |
| `postgresql` backend | PostgreSQL implementation for production |

### Modified Components

| Component | Changes |
|-----------|---------|
| `ark-controller` | No changes - uses standard K8s client, unaware of backend |
| Helm chart | Add ark-apiserver deployment, storage config |
| CRD manifests | Removed - replaced by APIService registration |

### Unchanged Components

- All controllers (agent, model, query, etc.)
- Webhooks
- ark-api service
- ark-broker
- All executors

## Implementation Phases

### Phase 1: Proof of Concept
- Scaffold API server with apiserver-builder
- Implement SQLite backend for one resource (Query)
- Verify kubectl, controller, webhook work

### Phase 2: Full Resource Support
- Add all Ark resources to API server
- Implement PostgreSQL backend
- Add Helm chart support

### Phase 3: Production Hardening
- Connection pooling
- Health checks
- Metrics
- Documentation

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| apiserver-builder learning curve | Use KineExample as reference (already has SQL) |
| WATCH implementation complexity | Polling fallback for SQLite, LISTEN/NOTIFY for PostgreSQL |
| Migration from existing CRDs | Out of scope - address in follow-up |
| Performance unknown | Phase 1 includes basic benchmarks |

## Success Criteria

1. `kubectl get agents` works with SQLite backend
2. Controller reconciliation works unchanged
3. Admission webhooks fire correctly
4. RBAC enforced by kube-apiserver
5. Helm install works with storage config
6. Standalone mode runs without K8s

## Questions for Discussion

1. Should we support both CRD mode and Aggregated API mode (for migration)?
2. Which resources should move first? (Queries are highest value)
3. SQLite for production single-node deployments - yes or no?
4. Standalone mode priority - essential or nice-to-have?

## References

- [apiserver-builder-alpha](https://github.com/kubernetes-sigs/apiserver-builder-alpha)
- [sample-apiserver](https://github.com/kubernetes/sample-apiserver)
- [Kine - SQL backend for K8s](https://github.com/k3s-io/kine)
- [K8s API Aggregation docs](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/apiserver-aggregation/)
