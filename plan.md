# Plan: Model Provider/Type Migration

## Summary

Complete the Model schema split where `spec.provider` is the AI client (openai/azure/bedrock) and `spec.type` is the API capability (completions, future: embeddings). Add a mutating webhook to auto-migrate existing models when annotated.

## Current State

- **CRD**: Has both `spec.provider` and `spec.type` fields ✓
- **Printer columns**: Show PROVIDER and TYPE ✓ (but PROVIDER empty for old models)
- **Operator code**: Uses `GetProvider()` fallback logic to handle old format
- **ark-api**: Uses `get_provider_from_spec()` fallback logic
- **Dashboard**: Updated to use `provider` field ✓
- **Existing models**: Have `spec.type: openai` (old format), no `spec.provider`

## Problem

Existing models show empty PROVIDER column in kubectl/k9s because they don't have `spec.provider` set. The fallback logic in code handles this at runtime, but the raw CRD data is unchanged.

## Solution

Add a **mutating webhook** that migrates old format to new format on create/update. Users trigger migration for existing models via annotation. After migration, remove fallback logic from operator and API code.

---

## Tasks

### 1. Add Mutating Webhook for Model

**File**: `ark/internal/webhook/v1/model_webhook.go`

Add `ModelCustomDefaulter` that:
- Detects old format: `spec.provider == ""` AND `spec.type` is a provider value
- Migrates: `spec.provider = spec.type`, `spec.type = "completions"`

```go
// +kubebuilder:webhook:path=/mutate-ark-mckinsey-com-v1alpha1-model,mutating=true,failurePolicy=fail,sideEffects=None,groups=ark.mckinsey.com,resources=models,verbs=create;update,versions=v1alpha1,name=mmodel-v1.kb.io,admissionReviewVersions=v1

type ModelCustomDefaulter struct{}

var _ webhook.CustomDefaulter = &ModelCustomDefaulter{}

func (d *ModelCustomDefaulter) Default(ctx context.Context, obj runtime.Object) error {
    model, ok := obj.(*arkv1alpha1.Model)
    if !ok {
        return fmt.Errorf("expected a Model object but got %T", obj)
    }

    // Migrate deprecated format: spec.type contained provider value
    // For upgrade details, see docs/content/reference/upgrading.mdx
    if model.Spec.Provider == "" && genai.IsDeprecatedProviderInType(model.Spec.Type) {
        model.Spec.Provider = model.Spec.Type
        model.Spec.Type = genai.ModelTypeCompletions
    }

    return nil
}
```

Update `SetupModelWebhookWithManager` to include `.WithDefaulter(&ModelCustomDefaulter{})`.

### 2. Regenerate Webhook Manifests

```bash
cd ark && make manifests
```

This generates the mutating webhook configuration in `config/webhook/`.

### 3. Update Upgrading Documentation

**File**: `docs/content/reference/upgrading.mdx`

Add section for this version (e.g., v0.1.50):

```markdown
## v0.1.50

### Model Provider Field

Prior to `v0.1.50`, the `spec.type` field on Models was overloaded to specify both:
- The AI provider client (openai, azure, bedrock)
- The API capability type

From `v0.1.50`, these are separate fields:
- `spec.provider`: The AI provider client (openai, azure, bedrock)
- `spec.type`: The API capability (completions, embeddings in future)

**New models** should use the new format:
```yaml
spec:
  provider: openai
  type: completions  # optional, defaults to completions
```

**Existing models** using the old format (`spec.type: openai`) will continue to work but show a deprecation warning. On any update, they are automatically migrated to the new format.

To migrate all existing models:

```bash
# View current models - PROVIDER column may be empty for old format
kubectl get models

# Trigger migration by annotating all models
kubectl annotate models --all 'ark.mckinsey.com/migrate-provider=done' --overwrite

# Verify migration - PROVIDER column now populated
kubectl get models
```

This is a **non-breaking** change for new/updated resources. Existing models require the annotation trigger to migrate.
```

### 4. Add Webhook Tests

**File**: `ark/internal/webhook/v1/model_webhook_test.go`

Add tests for the defaulter:

```go
func TestModelCustomDefaulter_MigratesOldFormat(t *testing.T) {
    // Test: old format (type: openai, no provider) -> migrated
    model := &arkv1alpha1.Model{
        Spec: arkv1alpha1.ModelSpec{
            Type: "openai",
            // Provider is empty
        },
    }

    defaulter := &ModelCustomDefaulter{}
    err := defaulter.Default(context.Background(), model)

    assert.NoError(t, err)
    assert.Equal(t, "openai", model.Spec.Provider)
    assert.Equal(t, "completions", model.Spec.Type)
}

func TestModelCustomDefaulter_PreservesNewFormat(t *testing.T) {
    // Test: new format (provider: openai, type: completions) -> unchanged
    model := &arkv1alpha1.Model{
        Spec: arkv1alpha1.ModelSpec{
            Provider: "azure",
            Type:     "completions",
        },
    }

    defaulter := &ModelCustomDefaulter{}
    err := defaulter.Default(context.Background(), model)

    assert.NoError(t, err)
    assert.Equal(t, "azure", model.Spec.Provider)
    assert.Equal(t, "completions", model.Spec.Type)
}

func TestModelCustomDefaulter_HandlesAllProviders(t *testing.T) {
    for _, provider := range []string{"openai", "azure", "bedrock"} {
        model := &arkv1alpha1.Model{
            Spec: arkv1alpha1.ModelSpec{
                Type: provider,
            },
        }

        defaulter := &ModelCustomDefaulter{}
        err := defaulter.Default(context.Background(), model)

        assert.NoError(t, err)
        assert.Equal(t, provider, model.Spec.Provider)
        assert.Equal(t, "completions", model.Spec.Type)
    }
}
```

### 5. Keep Deprecation Warning in Validator

The validator already emits a deprecation warning. After migration, this warning won't appear (because the model is migrated before validation). But if someone manually creates a model with old format via raw API (bypassing webhook), the warning still helps.

**Current code** (keep as-is for safety):
```go
if genai.IsDeprecatedProviderInType(model.Spec.Type) {
    warnings = append(warnings, fmt.Sprintf(
        "spec.type=%q is deprecated; use spec.provider=%q instead (will be removed in 1.0)",
        model.Spec.Type, model.Spec.Type))
}
```

### 6. Remove Fallback Logic (After Migration Rollout)

Once all users have migrated, remove the fallback logic:

**File**: `ark/internal/genai/constants.go`
- Keep `IsDeprecatedProviderInType()` for webhook use
- Remove or simplify `GetProvider()` fallback

**File**: `ark/internal/genai/model.go`
- Use `spec.Provider` directly instead of `GetProvider()`

**File**: `services/ark-api/ark-api/src/ark_api/models/models.py`
- Remove `DEPRECATED_PROVIDER_TYPES` constant
- Remove `get_provider_from_spec()` fallback function

**File**: `services/ark-api/ark-api/src/ark_api/api/v1/models.py`
- Use `spec.get("provider")` directly

**Note**: This cleanup can be a separate PR after the migration webhook has been deployed and users have had time to migrate.

### 7. Update Chainsaw Tests (If Needed)

The chainsaw tests were already updated to use new format. Verify they still pass:

```bash
cd tests && chainsaw test --selector 'standard'
```

### 8. Verify Printer Columns Work

After migration, kubectl should show:

```
NAME                 PROVIDER   TYPE          MODEL        AVAILABLE
azure-gpt-4          azure      completions   gpt-4        True
claude-sonnet        openai     completions   claude-3.5   True
```

---

## Migration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     User triggers migration                      │
│  kubectl annotate models --all 'ark.mckinsey.com/migrate-provider=done' │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Kubernetes updates model                       │
│            (annotation change triggers update)                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Mutating Webhook intercepts                      │
│                                                                  │
│  if spec.provider == "" && spec.type in [openai,azure,bedrock]: │
│      spec.provider = spec.type                                   │
│      spec.type = "completions"                                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Validating Webhook runs                          │
│           (no deprecation warning - already migrated)            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Model saved to etcd                           │
│         spec.provider: openai, spec.type: completions            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                kubectl get models shows correctly                │
│            PROVIDER: openai, TYPE: completions                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Happens to Non-Migrated Models?

Until migrated:
- **Controller**: Uses `GetProvider()` fallback - model works correctly
- **API**: Uses `get_provider_from_spec()` fallback - returns correct provider
- **Dashboard**: Shows provider correctly (from API response)
- **kubectl**: Shows empty PROVIDER column, TYPE shows provider value

After migration:
- All fields populated correctly
- No fallback logic needed
- Clear separation of provider vs type

---

## Files to Modify

| File | Change |
|------|--------|
| `ark/internal/webhook/v1/model_webhook.go` | Add mutating webhook |
| `ark/internal/webhook/v1/model_webhook_test.go` | Add defaulter tests |
| `docs/content/reference/upgrading.mdx` | Add migration docs |
| `ark/config/webhook/` | Auto-generated by `make manifests` |

## Files to Clean Up Later (Separate PR)

| File | Change |
|------|--------|
| `ark/internal/genai/constants.go` | Simplify `GetProvider()` |
| `ark/internal/genai/model.go` | Remove fallback |
| `services/ark-api/.../models.py` | Remove fallback constants |
| `services/ark-api/.../api/v1/models.py` | Remove fallback function |

---

## Testing Checklist

- [ ] `make manifests` generates mutating webhook config
- [ ] `make test` passes in ark/
- [ ] New model with old format gets migrated on create
- [ ] Existing model gets migrated when annotated
- [ ] New model with new format is unchanged
- [ ] kubectl shows PROVIDER and TYPE columns correctly after migration
- [ ] Dashboard shows provider correctly
- [ ] Deprecation warning appears if webhook is bypassed
- [ ] Chainsaw tests pass

---

## Open Questions

1. **Version number**: What version should this be documented under in upgrading.mdx?
2. **Fallback removal timeline**: When can we safely remove the fallback logic? After one release cycle?
3. **Should we auto-migrate in controller?**: The current plan uses annotation trigger. Alternative: controller could auto-migrate on reconcile (more aggressive).
