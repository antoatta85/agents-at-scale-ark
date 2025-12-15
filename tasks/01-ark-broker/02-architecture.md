---
owner: Ark Architect
description: Hypothesised Architecture for the Ark Broker
---

# Ark Broker - Architecture

## Overview

The Ark controller emits OTEL spans for query lifecycle events. The controller's telemetry layer **forks** spans to two destinations:

1. **External OTEL backend** (Langfuse, Phoenix, etc.) - existing flow, unchanged
2. **ark-broker** - HTTP/JSON OTLP endpoint for real-time visibility

Ark Broker events are sent real-time without local caching, so that the stream is as real time as possible. For query related events, OTEL is the canonical format for storage and transport to the broker, meaning that the query controller can be quite 'dumb' - it has an endpoint it forks to.

The Ark Broker receives:

- **OTEL spans** - Query lifecycle, tool calls, state transitions
- **LLM completion chunks** - Streaming tokens from the model
- **Messages** - Essentially the same as 'memory'. Whether we need this or can just use message traces I don't know.
- **A2A task updates** (Future) - Agent-to-agent coordination events

The Ark Broker sends:

- Traces: all the same format
- Events: basically traces filtered and mapped to a more user friendly ark format (including things that might not be traces under the hood)
- Sessions: An aggregate view of correlated events
- LLM Chunks: so that they can get the real time stream

## Architecture Diagram

The key components.

```
                                      Ark Platform
+------------------------------------------------------------------------------------------------------+
|                                                                                                      |
|  PRODUCERS                                  ARK-BROKER                        CONSUMERS              |
|                                                                                                      |
|  +------------------+                  +---------------------------+      +------------------+       |
|  |  Query           |   OTLP/HTTP      |                           | SSE  |  Dashboard       |       |
|  |  Controller      +------+---------->|   +=========+   +=====+   +----->|  (Sessions UI)   |       |
|  +------------------+      |           |   | Session |   | PVC |   |      +------------------+       |
|                            |           |   | Store   +-->|     |   |                                 |
|                            |           |   |         |   +=====+   |      +------------------+       |
|                            |           |   +=========+             | SSE  |  CLI (ark)       |       |
|                            |           |                           +----->|                  |       |
|                            |           |   APIs:                   |      +------------------+       |
|                            |           |   - POST /v1/traces       |                                 |
|                            |           |   - GET  /events          |      +------------------+       |
|                            |           |   - GET  /sessions        | REST |  API Clients     |       |
|                            |           |   - GET  /sessions/:id    +----->|                  |       |
|                            |           |                           |      +------------------+       |
|                            |           +---------------------------+                                 |
|                            |                                                                         |
|                            | OTLP/HTTP or gRPC (independent)                                         |
|                            v                                                                         |
|              +---------------------------+                                                           |
|              |  External OTEL Backend    |                                                           |
|              |  (Langfuse, Phoenix, etc.)|                                                           |
|              +---------------------------+                                                           |
|                                                                                                      |
+------------------------------------------------------------------------------------------------------+
```

The 'forking' is basically this:

```
# Current.
Controller -> Telemetry Provider -> Span Processor -> OTLP Exporter -> External Backend

# Proposed. The broker is now a sink for Memory Messages, LLM Chunks and OTEL traces.
# The broker also ensures consumers can read 'events' as well as the raw traces.
Controller -> Telemetry Provider -> Span Processor -> Forking Exporter -> External Backend
                                                                       |
                                                                       +-> ark-broker (if configured)
```

## APIs

Quick summary of what we have:

```
POST /v1/traces                 # Send OTEL events to broker. Or use gRPC. Anyone else can send...
GET /v1/traces                  # All traces, raw OTLP. Filterable/queryable.
GET /v1/traces?watch=true       # SSE stream of all spans real time for 'raw' events.
GET /events                     # 'Normalised' traces - anything we can convert to the more user-friendly ark...
GET /events?watch=true          # ...format this is the real-time version. We need a data dictionary.
GET /sessions                   # List of the sessions that exist. Essentially event sourced.
GET /sessions/123               # Snapshot of a session. Essentially event sourced.
GET /sessions/123?watch=true    # SSE of session events - note these are events not traces.

# Not sure about this name. A 'stream' is a topic? Look at a2a below as well to
# see if this roughly makes sense.
POST /stream/v1-chat-completions-chunks/ # Basically what is in cluster memory - stream in/out chunks.
POST /stream/a2a-task-updates/  # Don't need for now, but this is what a2a'd use.

# OR is events now a stream too? Like this?
GET /stream/events
GET /stream/events?watch=true
```

### Session Structure (aggregated view)

Here's an example of what `GET /sessions/session-abc-123` might return conceptually. Note that this shows 'events'.

Not happy with this structure yet at all.

```
+-- session-abc-123 (active)
|   +-- query-001 (done)
|   |   +-- [event] query.started
|   |   +-- [stream] LLM chunks (52 tokens) > click to replay
|   |   +-- [tool] web_search("weather NYC") -> "72F sunny"
|   |   +-- [event] query.completed (1.2s)
|   |
|   +-- query-002 (waiting)
|   |   +-- [event] query.started
|   |   +-- [stream] LLM chunks (23 tokens) > click to replay
|   |   +-- [tool] ask_question -> "Approve production deploy?"
|   |   +-- [question] Waiting for response...
|   |   +-- [a2a] task-xyz (pending)
|   |
|   +-- query-003 (running)
|       +-- [event] query.started
|       +-- [stream] LLM streaming...
```

### SSE Stream (v1/completions consumer view)

The broker is now able to send custom events back via the completions endpoint, meaning that consumers can use the regular completions API and simply listen for the ark specific events:

```
# Note this is an ark specific event. Allowed in the spec - unrecognised chunks
# are simply ignored. We already do this for team calls.
data: {"type":"event","event":{"type":"query.started","queryName":"q1"}}

# Regular chunks.
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" world"}}]}

# Ark events.
data: {"type":"event","event":{"type":"tool.called","tool":"ask_question"}}
data: {"type":"event","event":{"type":"question.answered"}}

# More regular chunks.
data: {"choices":[{"delta":{"content":"Approved!"}}]}
data: {"choices":[{"delta":{},"finish_reason":"stop"}]}
data: [DONE]
```

## Data Storage

- Store traces as raw OTEL.
- Build up the `session` object as events come in (i.e. we're doing our own event sourcing)
- When consumers want to read `events` we are mapping 'traces' -> 'events'

## Data Format

Do we need to normalise/transform raw ugly OTEL into more user friendly ark events? These would make it easier for consumers.

TODO

## Open Questions

- **Service identity**: Rename ark-cluster-memory to ark-broker, or keep as-is?
- **Event persistence**: Store all events for replay, or just current state for resume?
- **Protocol** - HTTP, gRPC or both? SSE for streaming?
- **Data Format** - Do we use OTEL event format when _receiving_ events or normalize into something cleaner?
- **Broker** - do we start simple w/ in-mem and later make swappable to Kafka/Temporal/Redis streams?
- **Storage** - do we start simple w/ json on disk and then later make it swappable to RDS etc?
- **OTEL** - should the broker itself be the OTEL forwarder? I.e. reverse proxy?
- **Custom events** - Teams can fire their own events, maybe to `/stream/{eventName}` or something. Essentially hitching a ride on the transport layer [eg for teams wanting to fire out log messages]
- `/stream/v1-chat-completions-chunks/` - is there any better name here? Should get this right.


## Later

- **MCP load balancing**: How to handle stateful MCP connections with multiple replicas?

