# Ark Broker - Architecture

## Overview

Uses OTEL as the canonical format for event correlation.
**OTEL as lingua franca**: All execution events (tool calls, state changes, questions) flow as OTEL spans with trace IDs for correlation.

## Open Questions

1. **Service identity**: Rename ark-cluster-memory to ark-broker, or keep as-is?
3. **Event persistence**: Store all events for replay, or just current state for resume?

## Later

2. **MCP load balancing**: How to handle stateful MCP connections with multiple replicas?
