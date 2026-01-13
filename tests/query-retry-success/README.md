# Query Retry Success

Tests that a query with retryPolicy succeeds after initial failure.

## What it tests
- Query fails on first attempt (mock-llm returns 500)
- Retry policy triggers retry with backoff
- Second attempt succeeds (mock-llm returns 200)
- Response content confirms retry succeeded ("Success after retry")

## Running
```bash
chainsaw test ./tests/query-retry-success --fail-fast
```

Successful completion validates that retry logic correctly retries failed queries.
