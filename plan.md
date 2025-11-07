# Plan: Move A2A Context/Task ID from Annotation to Status

## Overview
Move A2A context ID and task ID from Query annotations to Query status to fix the reconciliation loop anti-pattern. Controller currently calls `r.Update()` to set annotations, which increments generation and triggers unnecessary reconciliation.

## Progress

✅ Phase 1: Query CRD changes (completed)
✅ Phase 2: Query controller updates (completed)
✅ Phase 3: Streaming updates (completed - A2A metadata in final chunk via queryStatus)
✅ Phase 4: ark-cli updates (completed - added QueryStatus type and queryStatus field to ArkMetadata)
✅ Phase 5: Documentation updates (completed - a2a-queries.mdx, query.mdx, a2atask.mdx, streaming.mdx)
✅ Phase 6: Tests (completed - updated a2a-message-context test to read from status)
✅ Phase 7: Deprecation comments (skipped - not needed)

## Implementation Phases

### Phase 1: Add Status Fields to Query CRD ✅

**Files to modify:**
1. `ark/api/v1alpha1/query_types.go` - Add A2A metadata struct to QueryStatus
2. `ark/config/crd/bases/ark.mckinsey.com_queries.yaml` - Auto-generated CRD
3. `ark/dist/chart/templates/crd/ark.mckinsey.com_queries.yaml` - Manually apply CRD patch (preserve Helm templating)

**Changes:**
```go
// ark/api/v1alpha1/query_types.go

type QueryStatus struct {
    Phase      string              `json:"phase,omitempty"`
    Conditions []metav1.Condition  `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
    Responses  []Response          `json:"responses,omitempty"`
    TokenUsage TokenUsage          `json:"tokenUsage,omitempty"`
    Duration   *metav1.Duration    `json:"duration,omitempty"`

    // A2A contains A2A protocol-specific metadata including context and task identifiers
    // +kubebuilder:validation:Optional
    A2A *A2AMetadata `json:"a2a,omitempty"`
}

// A2AMetadata contains metadata from A2A protocol interactions
type A2AMetadata struct {
    // ContextID is the A2A protocol context identifier for grouping related interactions
    // +kubebuilder:validation:Optional
    ContextID string `json:"contextId,omitempty"`

    // TaskID is the A2A protocol task identifier if this query created an A2ATask
    // +kubebuilder:validation:Optional
    TaskID string `json:"taskId,omitempty"`
}
```

**Steps:**
1. Add `A2AMetadata` struct to query_types.go
2. Add `A2A *A2AMetadata` field to `QueryStatus`
3. Run `make manifests` to regenerate CRDs
4. **Manually** apply the exact patch to `ark/dist/chart/templates/crd/ark.mckinsey.com_queries.yaml` (preserve Helm templating)
5. Run tests: `make test`

### Phase 2: Update Query Controller

**File to modify:**
- `ark/internal/controller/query_controller.go` (lines 196-205)

**Remove annotation write:**
```go
// DELETE THIS (lines 196-205):
// Set A2A contextID annotation if present, update metadata first before status
if contextID := tokenCollector.GetA2AContextID(); contextID != "" {
    if obj.Annotations == nil {
        obj.Annotations = make(map[string]string)
    }
    obj.Annotations[annotations.A2AContextID] = contextID
    if err := r.Update(opCtx, &obj); err != nil {
        log.Error(err, "failed to update query annotations with A2A contextID")
    }
}
```

**Add status write:**
```go
// ADD THIS (before updateStatus call at line 219):
// Set A2A metadata in status if present
if contextID := tokenCollector.GetA2AContextID(); contextID != "" {
    if obj.Status.A2A == nil {
        obj.Status.A2A = &arkv1alpha1.A2AMetadata{}
    }
    obj.Status.A2A.ContextID = contextID
}
```

**Steps:**
1. Remove annotation write block (lines 196-205)
2. Add status.a2a.contextId write before `updateStatus()` call
3. Remove unused import if needed
4. Run tests: `make test`
5. Run linting: `make lint-fix`

### Phase 3: Update ark-api to Return A2A Metadata

**File to modify:**
- `services/ark-api/ark-api/src/ark_api/api/v1/openai.py`

**Changes:**
After query completes, extract A2A metadata from status and include in response/streaming chunks:

```python
# After poll_query_completion, extract A2A metadata
query_status = query.get("status", {})
a2a_metadata = query_status.get("a2a", {})

# For streaming: inject into chunks via ark metadata
chunk["ark"] = {
    "query": query_name,
    "agent": agent_name,
    "a2a": {
        "contextId": a2a_metadata.get("contextId"),
        "taskId": a2a_metadata.get("taskId")
    } if a2a_metadata else None
}

# For non-streaming: include ark metadata in response
```

**Steps:**
1. Locate where query status is read after completion
2. Extract `status.a2a` from query
3. Include in `ark` metadata field (both streaming and non-streaming)
4. Run tests: `cd services/ark-api && make test`

### Phase 4: Update ark-cli TypeScript Types

**File to modify:**
- `tools/ark-cli/src/lib/chatClient.ts` (line 20-26)

**Changes:**
```typescript
export interface ArkMetadata {
    agent?: string;
    team?: string;
    model?: string;
    query?: string;
    target?: string;
    a2a?: {
        contextId?: string;
        taskId?: string;
    };
}
```

**Steps:**
1. Add `a2a` field to `ArkMetadata` interface
2. ark-cli already extracts this from chunks (line 74), no logic changes needed
3. Run tests: `cd tools/ark-cli && npm test`

### Phase 5: Update Documentation

**Files to modify:**
1. `docs/content/developer-guide/queries/a2a-queries.mdx` (lines 78-133)

**Changes:**
- Update kubectl commands to read from status instead of annotations:
```bash
# OLD (remove)
CONTEXT_ID=$(kubectl get query count-messages -o jsonpath='{.metadata.annotations.ark\.mckinsey\.com/a2a-context-id}')

# NEW (update to)
CONTEXT_ID=$(kubectl get query count-messages -o jsonpath='{.status.a2a.contextId}')
```

- Add note that users can still SET context ID via annotation (input), but read from status (output)
- Update example YAML to show both patterns

**Steps:**
1. Update documentation examples
2. Update kubectl commands
3. Add clarification about input (annotation) vs output (status)

### Phase 6: Update Tests

**Files to modify:**
- `tests/a2a-message-context/chainsaw-test.yaml` (lines 58-72, 97-105)

**Changes:**
- Update assertions to check `.status.a2a.contextId` instead of `.metadata.annotations["ark.mckinsey.com/a2a-context-id"]`
- Update context ID extraction logic to use status

**Steps:**
1. Update test assertions for status field
2. Run integration tests

### Phase 7: Deprecate Annotation Constant

**File to modify:**
- `ark/internal/annotations/annotations.go` (line 20)

**Changes:**
```go
// A2AContextID is deprecated - use status.a2a.contextId instead
// This constant is kept for reading user-provided context ID on new queries (input)
// Controllers should write to status.a2a.contextId (output)
A2AContextID = ARKPrefix + "a2a-context-id"
```

## Key Principles

1. **No backwards compatibility** - Clean break, annotation for input only
2. **Annotation for user input** - Users SET context ID via annotation on NEW queries
3. **Status for controller output** - Controller writes to `status.a2a.contextId` and `status.a2a.taskId`
4. **Manual CRD patching** - Must manually apply CRD changes to dist/ file to preserve Helm templating
5. **Fix anti-pattern** - Removes `r.Update()` call that triggers reconciliation loops

## Benefits

- ✅ Fixes reconciliation loop anti-pattern (no metadata updates during reconciliation)
- ✅ Clean separation: annotation=input, status=output
- ✅ Supports both streaming and non-streaming via ark metadata
- ✅ Enables future A2A task ID tracking
- ✅ Follows Kubernetes best practices

## Testing Strategy

1. Unit tests for query_types.go
2. Controller tests for status update logic
3. Integration tests for A2A message context continuity
4. Manual testing with ark-cli ChatUI
5. Verify CRD changes in both config/ and dist/

## Order of Execution

**Start with CRD first** as requested:
1. Phase 1: Query CRD changes (types + manifests + dist/ manual patch)
2. Phase 2: Query controller updates
3. Phase 3: ark-api updates
4. Phase 4: ark-cli updates
5. Phase 5: Documentation
6. Phase 6: Tests
7. Phase 7: Deprecation comments
