# Architecture

> Stub - to be filled in after objectives and acceptance criteria are approved.

## High-Level Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                         QUERY ENTRY POINTS                          │
├─────────────────────────────────┬───────────────────────────────────┤
│         Query CRD               │          POST /queries            │
│     (kubectl apply)             │          (broker API)             │
└────────────────┬────────────────┴──────────────────┬────────────────┘
                 │                                    │
                 ▼                                    ▼
┌────────────────────────────────┐  ┌────────────────────────────────┐
│      QUERY CONTROLLER          │  │         ARK BROKER             │
│  - Watches Query CRDs          │  │  - REST API                    │
│  - Routes based on config      │  │  - Session management          │
│  - Runs QueryReconciler OR     │  │  - Streaming (SSE)             │
│    forwards to broker          │  │  - Runs QueryReconciler        │
└───────────────┬────────────────┘  └───────────────┬────────────────┘
                │                                    │
                │    ┌───────────────────────┐       │
                └───▶│   QUERY RECONCILER    │◀──────┘
                     │  - Resolution logic   │
                     │  - Agent loop         │
                     │  - Tool execution     │
                     └───────────────────────┘
```

## Topics to Address

- [ ] QueryReconciler interface definition
- [ ] Broker detection mechanism
- [ ] Routing decision logic
- [ ] Status sync protocol (broker -> CRD)
- [ ] Error handling across boundaries
- [ ] Configuration schema
