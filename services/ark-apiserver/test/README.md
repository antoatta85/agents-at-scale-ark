# Ark API Server E2E Test

Tests CRUD operations against the aggregated API server with SQLite backend.

## What it tests
- Resource creation via kubectl
- Resource retrieval and listing
- Resource updates
- Resource deletion (soft delete)
- Watch events for controllers

## Running
```bash
chainsaw test
```

Successful test completion validates the API server correctly handles all standard Kubernetes API operations.
