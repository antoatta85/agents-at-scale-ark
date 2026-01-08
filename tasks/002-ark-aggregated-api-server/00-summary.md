# Ark Aggregated API Server

## Overview

Replace Ark's CRD-based storage (etcd) with a custom Aggregated API Server backed by pluggable storage (SQLite, PostgreSQL, MySQL).

## Problem

Ark resources stored as CRDs hit etcd limits at scale:

```
1 query = 3-4 etcd writes
1000 queries/sec = 3000-4000 etcd writes/sec → etcd bottleneck
```

etcd is shared by the entire Kubernetes cluster. Overloading it with Ark resources affects all cluster operations.

## Proposal

Ark implements its own API server that:
- Registers with Kubernetes via API aggregation
- Stores all Ark resources in pluggable backends (SQLite, PostgreSQL, MySQL)
- Remains fully Kubernetes-native (kubectl, RBAC, controllers all work)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Kubernetes Cluster                               │
│                                                                          │
│   kubectl get agents        kubectl get pods                            │
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
│   │  pods    │            │  agents      │                              │
│   │  services│            │  models      │                              │
│   └──────────┘            │  queries     │                              │
│                           │  teams       │                              │
│                           │  tools       │                              │
│                           └──────┬───────┘                              │
│                                  │                                       │
│                                  ▼                                       │
│                           ┌──────────────┐                              │
│                           │   Storage    │                              │
│                           │  SQLite /    │                              │
│                           │  PostgreSQL  │                              │
│                           └──────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
```

## What Still Works

| K8s Feature | Works? |
|-------------|--------|
| `kubectl get agents` | ✅ |
| `kubectl apply -f` | ✅ |
| RBAC | ✅ |
| Namespaces | ✅ |
| Helm / GitOps | ✅ |
| Controllers | ✅ |
| Admission webhooks | ✅ |
| Watch / informers | ✅ |

## Storage Backends

```
Simple ◄──────────────────────────────────────────► Production

SQLite                PostgreSQL              Cloud DB (RDS)
──────                ──────────              ──────────────
Single file           Server required         Fully managed
Zero config           Self-hosted             Enterprise
Local/dev/demos       Production              Multi-region
```

```yaml
# values.yaml
ark:
  storage:
    driver: sqlite      # or postgresql, mysql
    # SQLite
    path: /data/ark.db
    # PostgreSQL
    # host: postgres.example.com
    # database: ark
```

## Benefits

| Benefit | Impact |
|---------|--------|
| No etcd limits | All Ark resources scale without limit |
| SQL queries | Complex filtering, aggregation, reporting |
| Full-text search | Search prompts, query inputs/outputs |
| Custom endpoints | `/v1/chat` streaming built into API server |
| Standalone mode | Run Ark without K8s (just SQLite) |
| Audit history | SQL makes historical analysis easy |
| Reduced cluster impact | Ark load isolated from K8s operations |

## Standalone Mode (Bonus)

Run Ark without Kubernetes for simple deployments:

```bash
# No K8s required
ark-server --storage=sqlite --db-path=./ark.db

# Or with Docker
docker run -v ./data:/data ark-server --storage=sqlite
```

## Related Issues

- [#684](https://github.com/mckinsey/agents-at-scale-ark/pull/684) - RFC: Query Resolution Architecture
- [#636](https://github.com/mckinsey/agents-at-scale-ark/issues/636) - RFC: Query Controller Scaling and Sharding
