# Ark API Server Integration Test

Full integration test for the Ark stack using the aggregated API server as the storage backend.

## What it tests
- Ark API server deployment with SQLite backend
- Ark controller deployment with CRDs disabled
- API server registration with Kubernetes
- Controller watches resources via API server
- Full Model → Agent → Query flow
- Query execution and response

## Known Limitations

**Concurrent Request Handling**: The ark-apiserver has a known issue where concurrent LIST requests (sent by the controller when syncing informer caches) may timeout. This is tracked for future improvement. Individual kubectl operations work correctly.

## Prerequisites

This test requires **cert-manager** installed in the cluster (controller needs TLS certs for webhooks).

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
kubectl wait --for=condition=Available deployment --all -n cert-manager --timeout=300s
```

## Running

```bash
# Run the test (uses mock-llm, no API key needed)
chainsaw test

# With local images (for local development)
ARK_APISERVER_IMAGE=ark-apiserver \
ARK_APISERVER_IMAGE_TAG=latest \
ARK_CONTROLLER_IMAGE=ark-controller \
ARK_CONTROLLER_IMAGE_TAG=latest \
ARK_IMAGE_PULL_POLICY=Never \
chainsaw test
```

## Simpler Alternative

For basic CRUD testing without cert-manager, use the API server tests:
```bash
cd services/ark-apiserver
chainsaw test test/
```

## Selector

This test has label `apiserver: "true"` to run separately from standard tests:
```bash
# Run only API server integration tests
chainsaw test --selector 'apiserver=true'

# Exclude API server tests from standard run
chainsaw test --selector '!apiserver'
```
