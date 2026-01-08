# Architecture

> Stub - to be filled in after objectives and acceptance criteria are approved.

## High-Level Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Kubernetes Cluster                               │
│                                                                          │
│   ┌─────────────────────────────────────────────┐                       │
│   │              kube-apiserver                  │                       │
│   └─────────────────┬───────────────────────────┘                       │
│        ┌────────────┴────────────┐                                      │
│        ▼                         ▼                                       │
│   ┌──────────┐            ┌──────────────┐                              │
│   │  Core    │            │  Ark API     │                              │
│   │  (etcd)  │            │  Server      │                              │
│   └──────────┘            └──────┬───────┘                              │
│                                  │                                       │
│                                  ▼                                       │
│                           ┌──────────────┐                              │
│                           │   Storage    │                              │
│                           │   Backend    │                              │
│                           └──────────────┘                              │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │                     Ark Controller (unchanged)                    │  │
│   └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Topics to Address

- [ ] API server deployment topology (replicas, HA)
- [ ] Storage backend interface design
- [ ] SQLite implementation details
- [ ] PostgreSQL implementation details (connection pooling, migrations)
- [ ] WATCH implementation (polling vs LISTEN/NOTIFY)
- [ ] APIService registration
- [ ] Certificate management
- [ ] Health checks and readiness probes
- [ ] Metrics and observability
- [ ] Helm chart structure
- [ ] Standalone mode architecture
