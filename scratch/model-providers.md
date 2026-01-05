# Model Provider/Type Schema Split - Statement of Work

**Issue:** https://github.com/mckinsey/agents-at-scale-ark/issues/37
**Scope:** Pre-work for embedding model support

## Background

The Model CRD currently uses `spec.type` for two purposes:
1. Which client library to use (OpenAI, Azure, Bedrock)
2. Which API the model implements (implicitly: chat completions)

This conflation prevents supporting embedding models. We need to split `spec.type` into two fields.

## Schema Change

```yaml
# Current (deprecated)
apiVersion: ark.mckinsey.com/v1alpha1
kind: Model
spec:
  type: openai  # Overloaded meaning

# New
apiVersion: ark.mckinsey.com/v1alpha1
kind: Model
spec:
  type: completions      # API type: completions | embeddings (default: completions)
  provider: openai       # Client: openai | azure | bedrock
```

## Deliverables

### 1. Model CRD Update

**File:** `ark/api/v1alpha1/model_types.go`

- Add `spec.provider` field (enum: `openai`, `azure`, `bedrock`)
- Change `spec.type` to new semantics (enum: `completions`, `embeddings`)
- `spec.type` defaults to `completions` if omitted
- Regenerate CRD manifests (`make manifests`)

### 2. Mutating Webhook

**File:** `ark/internal/webhook/model_webhook.go` (create or extend)

Migration logic:
- If `spec.provider` is empty AND `spec.type` is one of (`openai`, `azure`, `bedrock`):
  - Set `spec.provider` = old `spec.type` value
  - Set `spec.type` = `completions`
  - Emit deprecation warning in webhook response

Deprecation warning text:
```
Model.spec.type "openai", "azure", or "bedrock" is deprecated in favour of Model.spec.provider
```

### 3. Controller Updates

**Files:**
- `ark/internal/controller/query_controller.go`
- `ark/internal/genai/*.go`

- Update model client construction to use `spec.provider` instead of `spec.type`
- Existing completion logic continues to work (no behavior change yet)

### 4. Unit Tests

**Files:** `ark/internal/controller/*_test.go`, `ark/internal/webhook/*_test.go`

Test cases:
- New schema: `provider: openai, type: completions` works correctly
- New schema: `provider: azure, type: completions` works correctly
- New schema: `provider: bedrock, type: completions` works correctly
- Default: `provider: openai` with no `type` defaults to `completions`
- Migration: old `type: openai` converts to `provider: openai, type: completions`
- Migration: old `type: azure` converts to `provider: azure, type: completions`
- Migration: old `type: bedrock` converts to `provider: bedrock, type: completions`
- Webhook returns deprecation warning for migrated resources

### 5. Chainsaw E2E Tests

**Directory:** `tests/e2e/`

Update existing tests:
- Migrate sample Model resources to new schema format
- Verify existing query flows work with new schema

Add migration tests:
- Apply Model with old schema, verify webhook converts it
- Verify deprecation warning appears in kubectl output or events

### 7. SDK Update

- ark sdk must be updated

### 8. Ark API Updates

- ark apis must be updated

### 9. Dashboard Updates

- ark dashboard must be updated

### 10. CLI updates

- ark CLI must be upated
- fark CLI must be updated

### 6. Sample Updates

**Directory:** `samples/`

- Update all Model YAML files to use new `provider`/`type` schema
- Add comment noting the old format is deprecated

### 7. Documentation

**Files:** `docs/` (relevant Model reference pages)

- Document new `spec.provider` field
- Document new `spec.type` semantics
- Add migration guide section explaining the change
- Note deprecation timeline (if any) and deprecated notes page

## Validation Criteria

- [ ] All existing Model resources continue to work (backward compatible)
- [ ] New Models can be created with `provider`/`type` schema
- [ ] Old Models trigger deprecation warning on create/update
- [ ] `make test` passes in `ark/` directory
- [ ] Chainsaw tests pass
- [ ] Docs build successfully

## Out of Scope

- EmbeddingsQueryReconciler implementation (separate work item)
- QueryReconciler interface extraction (separate work item)
- Query targets simplification (separate issue #635)

## Files Changed (Expected)

```
ark/api/v1alpha1/model_types.go
ark/api/v1alpha1/zz_generated.deepcopy.go
ark/config/crd/bases/ark.mckinsey.com_models.yaml
ark/internal/webhook/model_webhook.go
ark/internal/controller/query_controller.go
ark/internal/genai/openai.go (or equivalent)
ark/internal/controller/*_test.go
ark/internal/webhook/*_test.go
tests/e2e/model-*.yaml (various)
samples/models/*.yaml
docs/pages/reference/model.mdx (or equivalent)
```
