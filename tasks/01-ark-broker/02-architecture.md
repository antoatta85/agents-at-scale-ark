# Ark Broker - Architecture

## Overview

Ark Broker extends ark-cluster-memory to handle questions and provide unified visibility into query execution. Uses OTEL as the canonical format for event correlation.

## Key Decision

**OTEL as lingua franca**: All execution events (tool calls, state changes, questions) flow as OTEL spans with trace IDs for correlation.

## Open Questions

1. **Service identity**: Rename ark-cluster-memory to ark-broker, or keep as-is?
2. **MCP load balancing**: How to handle stateful MCP connections with multiple replicas?
3. **Event persistence**: Store all events for replay, or just current state for resume?
4. **Scope**: Start with questions only, or include full execution visibility?

## References

See `99-references/` for detailed architecture from the spike:
- `02-architecture.md` - Full component diagrams and data models
- `04-outcome.md` - OTEL decision rationale
- `99-findings/` - Architecture findings and proposals
