# Ark API Server

Aggregated API Server for Ark resources with pluggable storage backends.

## Quickstart

```bash
make help

make build-binary
make dev

make install
make uninstall
```

## Storage Backends

### SQLite (Default)

Zero-configuration storage for development and simple deployments.

```bash
make dev
```

### PostgreSQL

Production-ready storage with connection pooling and LISTEN/NOTIFY for WATCH.

```yaml
storage:
  driver: postgresql
  postgresql:
    host: postgres.example.com
    port: 5432
    database: ark
    username: ark
    existingSecret: ark-db-credentials
```

## Architecture

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
│   │  Core    │            │  Ark API     │  ← This service              │
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
└─────────────────────────────────────────────────────────────────────────┘
```

## Development

```bash
go mod tidy
make generate      # regenerate deepcopy after type changes
make build-binary
make dev
```

Test with kubectl:

```bash
kubectl get queries
kubectl create -f samples/query.yaml
kubectl get query test-query -o yaml
kubectl delete query test-query
```
