# Query Retry Exhaustion

Tests that a query exhausts all retries and ends in error phase.

## What it tests
- Query fails on all attempts (mock-llm always returns 500)
- Retry policy exhausts maxRetries
- Query ends in error phase

## Running
```bash
chainsaw test ./tests/query-retry-exhaustion --fail-fast
```

Successful completion validates that retry logic correctly stops after maxRetries and reports error state.
