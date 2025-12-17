---
owner: Ark Protocol Orchestrator
description: Acceptance Criteria for the Ark Broker
---

# Acceptance Criteria

How we know we're done.

## Core Criteria

- Zero query events written to K8S Events API
- Tool calls visible in dashboard within 500ms
- Query can resume after controller restart
- LLM completion chunks stream in real-time to consumers
- Session aggregates all related queries with correlation

## Operational Criteria

- Ark controller operates normally without broker (graceful degradation)
- Events retained for configurable duration (default 30 days)
- SSE streams work for real-time consumers (dashboard, CLI)

## API Criteria

- REST API for querying traces, events, sessions
- SSE endpoints for real-time streaming
- OTLP-compatible endpoint for receiving traces
