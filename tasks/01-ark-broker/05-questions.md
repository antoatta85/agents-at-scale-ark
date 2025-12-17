---
owner: Ark Protocol Orchestrator
description: Open questions and discussion points for the Ark Broker
---

# Ark Broker - Questions

Questions raised during review that need discussion or resolution.

## OTEL spans only export after completion - how do we get real-time visibility?

**Source**: PR #604 review comment

OTEL exporters forward spans only after completion. A query span waiting for human input won't appear until the query finishes - potentially hours later.

Child spans (tool calls) export as they complete, but the parent query span stays invisible. Worth noting how real-time visibility will work for in-progress queries.

**Status**: Open

## Why OTEL specifically?

**Source**: PR #604 review comment

The key value proposition is **trace correlation** - linking tool calls → queries → sessions via trace IDs. Is OTEL the best format for this, considering trace IDs will only be able to correlate on the query and not the session level?

Without this, readers might wonder why not just use a custom event format.

**Status**: Open

## Should the broker track user/tenant identity at the session level?

**Source**: PR #604 review comment

Currently sessions are keyed only by `session_id` with no user association. For multi-tenancy scenarios:
- How do we scope `GET /sessions` to return only the current user's sessions?
- Who "owns" a session for access control purposes?

Options to consider:
1. Add `userId` as a first-class field on sessions
2. Rely on namespace isolation (but multiple users may share a namespace)
3. Propagate user identity as an OTEL span attribute from the caller

This affects the data model and API design - worth deciding early.

**Status**: Open

## Context compaction strategy

**Source**: PR #604 review comment

How do we compact completed workflow phases to keep session payloads bounded? What triggers compaction - time, phase transitions, event count?

For async agents at scale running long workflows:
- Unbounded event accumulation creates the same scaling problem cited for K8s events
- Compacted phases reduce storage growth and keep SSE streams/API responses bounded
- Agents resuming work need a summary, not hundreds of raw events from completed queries

**Status**: Open

## Is parallel execution within a session a future goal?

**Source**: PR #604 review comment

OTEL spans are designed to model parallel fan-out (sibling spans with shared parent). The session structure shown is strictly sequential (query-001 → query-002 → query-003).

If sessions will always be sequential, a simpler append-only event log (`session_id` + `sequence_number`) would suffice without trace/span complexity.

However, if we plan to support:
- One agent calling multiple sub-agents in parallel (A2A fan-out)
- Parallel tool execution (LLMs can request multiple tools in one response)
- Concurrent MCP operations

...then the span model is justified.

This is a one-way decision that affects storage schema, APIs, and query complexity. Worth clarifying intent before committing to OTEL as the canonical format.

**Status**: Open
