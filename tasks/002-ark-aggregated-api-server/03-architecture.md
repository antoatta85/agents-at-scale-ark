# Architecture

## High-Level Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Kubernetes Cluster                               │
│                                                                          │
│   kubectl get queries       kubectl get pods                            │
│        │                         │                                       │
│        ▼                         ▼                                       │
│   ┌─────────────────────────────────────────────┐                       │
│   │              kube-apiserver                  │                       │
│   └─────────────────┬───────────────────────────┘                       │
│        ┌────────────┴────────────┐                                      │
│        ▼                         ▼                                       │
│   ┌──────────┐            ┌──────────────┐                              │
│   │  Core    │            │  Ark API     │  ← Aggregated API            │
│   │  (etcd)  │            │  Server      │                              │
│   │          │            │              │                              │
│   │  pods    │            │  queries     │                              │
│   │  services│            │  agents      │                              │
│   └──────────┘            │  models      │                              │
│                           └──────┬───────┘                              │
│                                  │                                       │
│                                  ▼                                       │
│                           ┌──────────────┐                              │
│                           │   Storage    │                              │
│                           │  SQLite /    │                              │
│                           │  PostgreSQL  │                              │
│                           └──────────────┘                              │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                     Ark Controller (unchanged)                    │  │
│   └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Directory Structure

```
services/ark-apiserver/
├── cmd/apiserver/main.go           # Entry point, flag parsing, server setup
├── pkg/
│   ├── apis/ark/v1alpha1/
│   │   ├── types.go                # Query type definitions
│   │   └── register.go             # API group registration
│   ├── registry/query/storage.go   # REST storage implementation
│   └── storage/
│       ├── interface.go            # Backend interface
│       ├── converter.go            # Type serialization
│       └── sqlite/sqlite.go        # SQLite implementation
├── chart/                          # Helm chart
│   ├── templates/
│   │   ├── apiservice.yaml         # K8s API aggregation
│   │   ├── deployment.yaml
│   │   ├── rbac.yaml               # Auth delegator bindings
│   │   ├── service.yaml
│   │   ├── serviceaccount.yaml
│   │   └── pvc.yaml                # SQLite persistence
│   └── values.yaml
├── Dockerfile
├── Makefile
└── go.mod
```

### Storage Backend Interface

```go
type Backend interface {
    Create(ctx, kind, namespace, name string, obj runtime.Object) error
    Get(ctx, kind, namespace, name string) (runtime.Object, error)
    List(ctx, kind, namespace string, opts ListOptions) ([]runtime.Object, string, error)
    Update(ctx, kind, namespace, name string, obj runtime.Object) error
    Delete(ctx, kind, namespace, name string) error
    Watch(ctx, kind, namespace string, opts WatchOptions) (watch.Interface, error)
    GetResourceVersion(ctx, kind, namespace, name string) (int64, error)
    Close() error
}
```

### SQLite Schema

```sql
CREATE TABLE resources (
    kind TEXT NOT NULL,
    namespace TEXT NOT NULL,
    name TEXT NOT NULL,
    resource_version INTEGER PRIMARY KEY AUTOINCREMENT,
    generation INTEGER DEFAULT 1,
    uid TEXT NOT NULL,
    spec TEXT NOT NULL,
    status TEXT,
    labels TEXT,
    annotations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(kind, namespace, name)
);
```

### APIService Registration

```yaml
apiVersion: apiregistration.k8s.io/v1
kind: APIService
metadata:
  name: v1alpha1.ark.mckinsey.com
spec:
  group: ark.mckinsey.com
  version: v1alpha1
  service:
    name: ark-apiserver
    namespace: ark-system
    port: 443
  groupPriorityMinimum: 1000
  versionPriority: 15
```

### Helm Configuration

```yaml
storage:
  driver: sqlite  # or postgresql

  sqlite:
    path: /data/ark.db
    persistence:
      enabled: true
      size: 1Gi

  postgresql:
    host: ""
    port: 5432
    database: ark
    username: ark
    existingSecret: ""
```

## WATCH Implementation

### SQLite (Polling-based)

SQLite WATCH uses in-memory channel notification:
1. On Create/Update/Delete, backend notifies registered watchers
2. Watchers receive events via buffered channels
3. Channel buffer size: 100 events (drops if full)

### PostgreSQL (LISTEN/NOTIFY)

PostgreSQL WATCH uses native pub/sub:
1. Trigger function calls `pg_notify('ark_resources', ...)` on changes
2. Backend listens on `ark_resources` channel
3. Events delivered to watchers in real-time

