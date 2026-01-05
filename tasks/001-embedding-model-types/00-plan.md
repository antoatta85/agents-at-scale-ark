---
owner: ark-protocol-orchestrator
description: Add embedding model support via provider/type schema split and pluggable query reconcilers
---

# Embedding Model Types - Plan

**GitHub Issue:** https://github.com/mckinsey/agents-at-scale-ark/issues/37

## Tasks

- [x] Define objectives
- [ ] Design architecture → ark-architect
- [ ] Build verifiable prototype → ark-prototyper
- [ ] Document outcome

## Pre-work (can be done independently)

- [ ] Eliminate multiple query targets ([#635](https://github.com/mckinsey/agents-at-scale-ark/issues/635)) - simplifies routing to reconcilers
- [ ] Model CRD: Add `spec.provider`, migrate `spec.type` semantics, mutating webhook
- [ ] Extract `QueryReconciler` interface wrapping existing completion logic

## Phases

### Phase 1: Extract Interface/Registry
- Extract `QueryReconciler` interface from existing code
- Create `QueryReconcilerRegistry` for routing
- Wrap existing logic in `CompletionsQueryReconciler`
- No behavior change, pure refactor

### Phase 2: Embedding Support
- Add `EmbeddingsQueryReconciler`
- Extend Model CRD with `spec.provider` and `spec.type` fields
- Add mutating webhook for migration

## Open Decisions

- [ ] Embeddings response format: separate field vs encoded in Message

## Findings

Discoveries tracked in `99-findings/`:
- (none yet)
