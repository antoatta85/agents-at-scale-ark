# Ark API Server Integration Test

Full integration test for the Ark stack using the aggregated API server as the storage backend.

## What it tests
- Ark API server deployment with SQLite backend
- Ark controller deployment with CRDs disabled
- API server registration with Kubernetes
- Controller watches resources via API server
- Full Model → Agent → Query flow
- Query execution and response

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Ark Controller │────▶│  Ark API Server │
│   (no CRDs)     │     │   (SQLite)      │
└─────────────────┘     └─────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Reconcile      │     │  Store in       │
│  Resources      │     │  SQLite/PG      │
└─────────────────┘     └─────────────────┘
```

## Running

```bash
# Requires Azure OpenAI credentials
export E2E_TEST_AZURE_OPENAI_KEY="your-key"
export E2E_TEST_AZURE_OPENAI_BASE_URL="https://your-endpoint.openai.azure.com"

# Run the test
chainsaw test

# With custom images (for CI)
ARK_APISERVER_IMAGE=ghcr.io/org/ark-apiserver \
ARK_APISERVER_IMAGE_TAG=sha \
ARK_CONTROLLER_IMAGE=ghcr.io/org/ark-controller \
ARK_CONTROLLER_IMAGE_TAG=sha \
chainsaw test
```

## CI Integration

This test requires:
1. `ark-apiserver` container image built
2. `ark-controller` container image built
3. Azure OpenAI credentials configured

Add to CI workflow:
```yaml
- name: Run API server integration tests
  env:
    E2E_TEST_AZURE_OPENAI_KEY: ${{ secrets.AZURE_OPENAI_KEY }}
    E2E_TEST_AZURE_OPENAI_BASE_URL: ${{ secrets.AZURE_OPENAI_BASE_URL }}
    ARK_APISERVER_IMAGE: ${{ env.CI_REGISTRY }}/ark-apiserver
    ARK_APISERVER_IMAGE_TAG: ${{ github.sha }}
    ARK_CONTROLLER_IMAGE: ${{ env.CI_REGISTRY }}/ark-controller
    ARK_CONTROLLER_IMAGE_TAG: ${{ github.sha }}
  run: |
    cd tests
    chainsaw test --selector 'apiserver=true'
```

## Selector

This test has label `apiserver: "true"` to run separately from standard tests:
```bash
# Run only API server integration tests
chainsaw test --selector 'apiserver=true'

# Exclude API server tests from standard run
chainsaw test --selector '!apiserver'
```
