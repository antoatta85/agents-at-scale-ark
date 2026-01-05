---
owner: ark-protocol-orchestrator
description: Objectives for embedding model type support
---

# Embedding Model Types - Objectives

**GitHub Issue:** https://github.com/mckinsey/agents-at-scale-ark/issues/37

## Overview

Models currently assume all are chat completion models. This feature adds support for embedding models and establishes patterns for other non-completion model types. The approach splits `spec.type` into `spec.provider` (client construction) and `spec.type` (model capability), with pluggable query reconcilers handling different model types.

## Goals

1. **Support embedding models** - Allow queries to target embedding models with appropriate API calls
2. **Clean schema separation** - `spec.provider` for client (openai/azure/bedrock), `spec.type` for capability (completion/embedding)
3. **Pluggable reconcilers** - Route queries to appropriate handlers without monolithic switch statements
4. **Backward compatibility** - Migrate existing resources via mutating webhook with deprecation warnings

## Use Cases

- Generate embeddings for RAG pipelines using OpenAI, Azure, or Bedrock embedding models
- Mix completion and embedding models in the same Ark deployment
- Migrate existing Model resources without breaking changes

## Future Extensibility

The QueryReconciler pattern supports additional model types. Likely candidates:

| Type | API | Use Case |
|------|-----|----------|
| `response` | `/v1/responses` | OpenAI's agentic API with built-in tool handling |
| `image` | `/v1/images/generations` | Image generation (DALL-E) |
| `audio` | `/v1/audio/transcriptions` | Speech-to-text (Whisper) |
| `tts` | `/v1/audio/speech` | Text-to-speech |
| `rerank` | varies | Reranking for RAG pipelines |

The `response` type is most likely to follow `completion` and `embedding`, as it represents OpenAI's newer approach to agentic workflows.

## Success Criteria

- Queries targeting embedding models receive embedding API responses
- Query status accurately reflects embedding-specific outcomes
- Main query controller remains focused on orchestration
- Mutating webhook converts old format with deprecation warning
- Existing Model resources continue to work after migration
- One step closer to an architecture that allows us to break out query reconciliation into its own services
