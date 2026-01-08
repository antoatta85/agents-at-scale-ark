# Ark API Server E2E Test

Tests CRUD operations against the aggregated API server with SQLite backend.

## What it tests
- Helm chart deployment
- APIService registration with Kubernetes
- Resource creation via kubectl
- Resource retrieval and listing
- Resource updates
- Resource deletion (soft delete)

## Running

```bash
# From this directory
chainsaw test

# With custom image (for CI)
ARK_APISERVER_IMAGE=ghcr.io/org/ark-apiserver ARK_APISERVER_IMAGE_TAG=sha chainsaw test
```

## CI Integration

To run these tests in CI, add ark-apiserver to the build-containers matrix in `.github/workflows/cicd.yaml`:

```yaml
- path: services/ark-apiserver
  image: ark-apiserver
```

Then create a dedicated E2E job or run with:
```bash
ARK_APISERVER_IMAGE=$CI_REGISTRY/ark-apiserver ARK_APISERVER_IMAGE_TAG=$SHA chainsaw test
```

Note: The ark-apiserver replaces CRD-based storage, so tests must run in isolation from the main Ark controller.
