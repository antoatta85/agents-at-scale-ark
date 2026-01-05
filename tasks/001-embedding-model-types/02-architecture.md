---
owner: ark-architect
description: Technical design for embedding model type support
---

# Embedding Model Types - Architecture

**Status:** Draft

## Overview

This feature separates `spec.type` into `spec.provider` (client construction) and `spec.type` (model capability). A QueryReconcilerRegistry routes queries to type-specific reconcilers (completions, embeddings) that call the appropriate API endpoints.

## Query Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      QueryController                            │
│                                                                 │
│  ┌─────────────┐    ┌──────────────────────────────────────┐   │
│  │   Query     │───▶│         executeModel()                │   │
│  │  (target:   │    │                                       │   │
│  │   model)    │    │  1. Load Model CRD                    │   │
│  └─────────────┘    │  2. Get reconciler from registry      │   │
│                     │  3. Delegate to reconciler            │   │
│                     └───────────────┬──────────────────────┘   │
│                                     │                           │
│                     ┌───────────────▼───────────────┐           │
│                     │   QueryReconcilerRegistry     │           │
│                     │   GetReconciler(model.type)   │           │
│                     └───────────────┬───────────────┘           │
│                                     │                           │
│                    ┌────────────────┼────────────────┐          │
│                    ▼                ▼                ▼          │
│            ┌────────────┐  ┌────────────┐   ┌────────────┐     │
│            │Completions │  │Embeddings  │   │ (future)   │     │
│            │Query       │  │Query       │   │ Responses  │     │
│            │Reconciler  │  │Reconciler  │   │ Reconciler │     │
│            └─────┬──────┘  └─────┬──────┘   └────────────┘     │
│                  │               │                              │
│                  ▼               ▼                              │
│           /chat/completions  /embeddings                        │
│                  │               │                              │
│                  ▼               ▼                              │
│             Response:       Response:                           │
│             .content        .raw (float[])                      │
│             .raw            .content ("")                       │
└─────────────────────────────────────────────────────────────────┘
```

## Schema Change

```yaml
# Before (current)
apiVersion: ark.mckinsey.com/v1alpha1
kind: Model
spec:
  type: openai  # Overloaded: means both "use OpenAI client" and "chat completions"

# After
apiVersion: ark.mckinsey.com/v1alpha1
kind: Model
spec:
  provider: openai           # Client construction
  type: completions          # API type (default if omitted)
```

### Model CRD Fields

| Field | Values | Description |
|-------|--------|-------------|
| `spec.provider` | `openai`, `azure`, `bedrock` | Which client library to use |
| `spec.type` | `completions` (default), `embeddings` | Which API the model implements |

## File Structure

```
ark/internal/genai/
    query_reconciler.go             # QueryReconciler interface
    query_reconciler_registry.go    # Registry for type-based routing
    completions_query_reconciler.go # Wraps existing completion logic
    embeddings_query_reconciler.go  # New embeddings handler

ark/internal/controller/
    query_controller.go             # Inject registry, delegate in executeModel
```

## Input/Output Handling

### Current Query Input Types

The Query CRD supports two input formats via `spec.type`:
- `user` (default): String input converted to single user message
- `messages`: Array of OpenAI ChatCompletionMessageParamUnion objects

### Embedding Input

Embeddings use simpler input than completions. For embeddings:
- Use `spec.type: user` with a string input
- The embedding API accepts text directly, not a conversation array

```yaml
apiVersion: ark.mckinsey.com/v1alpha1
kind: Query
spec:
  type: user
  input: "Text to embed"
  targets:
    - type: model
      name: text-embedding-ada-002
```

### Embedding Output

The existing Response struct already has the right fields:

```go
type Response struct {
    Target  QueryTarget `json:"target,omitempty"`
    Content string      `json:"content,omitempty"`   # Empty for embeddings
    Raw     string      `json:"raw,omitempty"`       # JSON array of floats
    Phase   string      `json:"phase,omitempty"`
}
```

For embeddings:
- `content`: Empty string (embeddings have no text content)
- `raw`: JSON-serialized embedding vector `"[0.123, -0.456, ...]"`

Example response:
```yaml
status:
  phase: done
  responses:
    - target:
        type: model
        name: text-embedding-ada-002
      content: ""
      raw: "[0.0023064255,-0.009327292,...]"
      phase: done
```

## One-Way Decisions

1. **Should `spec.type` default to `completions`?** Yes - existing Models work without changes.

2. **Mutating webhook for migration?** Yes - auto-converts old format with deprecation warning.

## Open Questions

**Should the Query specify intent rather than the Model declaring its type?**

A single provider (e.g., OpenAI) can serve completions, embeddings, AND responses via the same credentials. The Model CRD just configures the connection. Two approaches:

| Approach | How it works | Trade-off |
|----------|--------------|-----------|
| **Model declares type** (current) | `Model.spec.type: embeddings` | Simple routing, but requires separate Model CRDs per API type |
| **Query declares intent** | `Query.spec.responseType: embeddings` | One Model serves multiple purposes, but Query becomes more complex |

Current design uses Model-declares-type for simplicity. Future work may revisit if users need one Model to serve multiple API types.

## Implementation Phases

1. **Schema update**: Add `spec.provider` field, make `spec.type` enum with `completions`/`embeddings`
2. **Mutating webhook**: Convert old `spec.type` values to new schema with deprecation warning
3. **QueryReconciler interface**: Extract interface and registry, wrap existing logic
4. **EmbeddingsQueryReconciler**: Implement embeddings handler with OpenAI
5. **Azure/Bedrock**: Add embeddings support for remaining providers

## Reference

See `01-objectives.md` for goals and success criteria.
