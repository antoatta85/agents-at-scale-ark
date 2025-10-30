# argo-workflows

Argo Workflows with Ark tenant for workflow orchestration.

## Installation

```bash
cd chart && helm dependency update
helm upgrade --install argo-workflows ./chart -n argo-workflows --create-namespace
```

## Local Development

```bash
devspace deploy -n argo-workflows
devspace dev -n argo-workflows  # Port-forward to http://localhost:2746
devspace purge -n argo-workflows
```

See [documentation](../../docs/content/developer-guide/workflows/argo-workflows.mdx) for full details.

## Future Improvements

### Artifact Storage Configuration

Currently, users must manually configure artifact storage (S3/Minio) if they want to use Argo's artifact repository features for passing data between workflow steps.

**Potential improvements:**

1. **Optional Minio subchart dependency** - Add minio-tenant as an optional chart dependency with `enabled: false` by default
2. **Automatic artifact repository configuration** - When minio is enabled, auto-configure the artifact repository ConfigMap with generated credentials
3. **S3 endpoint flexibility** - Allow users to configure external S3-compatible endpoints (AWS S3, Minio, etc.) via values

This would simplify the setup for users who need artifact storage while keeping the base chart lightweight for those who don't.

**Example values structure:**
```yaml
artifactRepository:
  enabled: false  # Optional feature
  type: minio     # or 's3', 'gcs', 'azure'

  # Minio-specific (when type: minio)
  minio:
    enabled: true
    # Auto-generate credentials or use provided values

  # S3-specific (when type: s3)
  s3:
    bucket: my-workflow-artifacts
    endpoint: s3.amazonaws.com
    region: us-east-1
    # Reference to existing secret with credentials
```

See [marketplace plugin chart](https://github.com/McK-Internal/agents-at-scale-marketplace/tree/main/services/ark-workflows) for reference implementation patterns.
