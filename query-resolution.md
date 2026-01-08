# Query Resolution Architecture

## Overview

Query resolution can operate in two modes depending on infrastructure and user intent.

## Terminology

| Term | Definition |
|------|------------|
| **QueryReconciler** | The engine that resolves a query to its desired state (completed with response) |
| **Direct Mode** | Query enters via K8s Query CRD, controller handles resolution |
| **Broker Mode** | Query enters via broker API, broker service handles resolution |

## Resolution Matrix

|  | **No Broker** | **Broker Installed** |
|--|---------------|----------------------|
| **Direct** | Controller reconciles in-proc | Controller forwards to broker |
| **Broker** | Error (no broker) | Broker reconciles directly |

## Behavior by Scenario

### No Broker + Direct
- Query CRD created
- Controller runs QueryReconciler in-proc
- Result written to `status.response`
- **Current behavior**

### No Broker + Broker
- POST to /queries fails
- No broker endpoint available
- Error returned to caller

### Broker Installed + Direct
- Query CRD created
- Controller forwards query to broker
- Broker runs QueryReconciler
- Controller syncs result back to `status.response`
- CRD is entry point, broker is engine

### Broker Installed + Broker
- POST to /queries
- Broker runs QueryReconciler
- Result streamed via SSE
- No Query CRD created
- Optional: caller can request CRD creation via `k8sRef`

## API Semantics

### Reading Queries

Reading is **transparent** - queries are aggregated from all sources with optional filtering.

```
GET /queries                    → All queries (CRDs + broker)
GET /queries?source=direct      → Only K8s CRDs
GET /queries?source=broker      → Only broker queries
GET /queries/{id}               → Find it wherever it lives
```

Unified view by default. User doesn't need to know where queries live unless they care.

### Writing Queries

Writing is **explicit** - caller specifies intent or system default applies.

```json
POST /queries
{
  "spec": {
    "input": "...",
    "reconciliation": "direct"
  }
}
```

| `reconciliation` field | Broker installed | Action |
|------------------------|------------------|--------|
| *omitted* | No | Create Query CRD (direct) |
| *omitted* | Yes | System default applies |
| `"direct"` | No | Create Query CRD |
| `"direct"` | Yes | Create Query CRD (controller forwards to broker) |
| `"broker"` | No | **Error** - broker not available |
| `"broker"` | Yes | Send to broker, no CRD |

## System Configuration

Operators can control default behavior and allowed modes.

```yaml
ark:
  query:
    defaultReconciliation: direct  # or "broker"
    allowedModes: [direct, broker] # or lock to one
```

| Config | Effect |
|--------|--------|
| `defaultReconciliation: direct` | Omitted field → creates CRD |
| `defaultReconciliation: broker` | Omitted field → sends to broker |
| `allowedModes: [broker]` | Force all queries through broker, reject direct |
| `allowedModes: [direct]` | Force all queries through CRDs, reject broker |

### Deployment Patterns

| Pattern | Config | Use Case |
|---------|--------|----------|
| Simple | `allowedModes: [direct]` | No broker, single controller |
| Scale (flexible) | `defaultReconciliation: broker` | Broker preferred, CRD still allowed |
| Scale (strict) | `allowedModes: [broker]` | All queries must go through broker |

## Related Issues

- [RFC: Query Controller Scaling and Sharding](https://github.com/mckinsey/agents-at-scale-ark/issues/636)
- [Epic: Ark Broker - Streaming and Sessions](https://github.com/mckinsey/agents-at-scale-ark/issues/549)
