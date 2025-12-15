# Ark Broker - Objectives

## Overview

Ark Broker extends ark-cluster-memory to provide two core capabilities:
1. **Async Questions** - Agent-user communication during query execution
2. **OTEL Eventing** - Real-time visibility into query execution

## Goals

### Questions
- **Async Agent-User Communication** - Agents ask users for details or clarifications without blocking
- **User-to-Agent Questions** - Users send questions to agents and receive responses
- **Channel Agnostic** - Support multiple channels (Dashboard, Slack, GitHub) through unified interface

### OTEL Eventing
- **Controller as Primary Producer** - Emit OTEL spans for query lifecycle, LLM calls, tool executions
- **Real-time Consumer Streaming** - Dashboard, CLI, API clients receive events via SSE as they happen
- **Session Aggregation** - Events correlated by trace ID into unified session views
- **Automatic A2A/MCP Capture** - Agent and tool interactions flow through controller instrumentation

## Use Cases

**Questions:**
- Agent requests clarification on ambiguous requirements
- Agent asks user to confirm before destructive action
- User sends follow-up question to running or paused agent
- User provides additional context mid-execution

**Eventing:**
- Watch agent reasoning and tool calls in real-time from dashboard
- Correlate questions back to the query that triggered them
- Replay completed sessions to understand what happened
- Resume or restart queries from retained state

## Success Criteria

- Questions can be created, retrieved, and answered through any channel
- Queries can pause and resume based on pending questions
- Controller emits spans for query lifecycle, LLM calls, and tool calls
- Events stream to consumers via SSE and correlate by trace ID
- External OTEL backends (Langfuse, Jaeger) receive events when configured
