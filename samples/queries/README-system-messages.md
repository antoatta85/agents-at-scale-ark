# System Messages in Memory

This demonstrates how ARK handles system messages in memory, with hydration controlled by query-level annotations.

## Overview

ARK now **always stores system messages in memory** for debugging and audit purposes. However, **hydration** (whether to include them when loading from memory) is controlled by a query-level annotation.

## How It Works

1. **Storage**: System messages are always stored in memory when agents execute queries
2. **Hydration**: Whether to include system messages when loading from memory is controlled per-query

## Annotation

```yaml
ark.mckinsey.com/memory-hydrate-system-message: "true"
```

### With Annotation (`query-with-system-messages.yaml`)

When this annotation is present on a Query:

```yaml
apiVersion: ark.mckinsey.com/v1alpha1
kind: Query
metadata:
  name: query-with-system-messages
  annotations:
    ark.mckinsey.com/memory-hydrate-system-message: "true"
spec:
  input: "What is 2+2?"
  memory:
    name: default
  sessionId: system-messages-demo
  targets:
    - type: agent
      name: sample-agent
```

- System messages **will be included** when loading from memory
- The agent's prompt will be part of the conversation context
- Useful for debugging or when you need the original prompt

### Without Annotation (`query-without-system-messages.yaml`)

When the annotation is NOT present (default behavior):

```yaml
apiVersion: ark.mckinsey.com/v1alpha1
kind: Query
metadata:
  name: query-without-system-messages
  # No annotation - system messages excluded by default
spec:
  input: "What is 2+2?"
  memory:
    name: default
  sessionId: system-messages-demo
  targets:
    - type: agent
      name: sample-agent
```

- System messages **will NOT be included** when loading from memory
- Only user and assistant messages are loaded
- The agent uses its current prompt, not the one from memory
- This is the default and recommended behavior for most use cases

## Usage Scenarios

### Scenario 1: Normal Conversation Flow (Default)
Use without annotation to ensure agents use their **current** prompt, not historical prompts:

```yaml
apiVersion: ark.mckinsey.com/v1alpha1
kind: Query
metadata:
  name: follow-up-query
spec:
  input: "Can you elaborate?"
  memory:
    name: default
  sessionId: conversation-123
  targets:
    - type: agent
      name: helpful-assistant
```

### Scenario 2: Debugging with Historical Context
Use with annotation when you need to see the original prompt:

```yaml
apiVersion: ark.mckinsey.com/v1alpha1
kind: Query
metadata:
  name: debug-query
  annotations:
    ark.mckinsey.com/memory-hydrate-system-message: "true"
spec:
  input: "What was the original context?"
  memory:
    name: default
  sessionId: debug-session
  targets:
    - type: agent
      name: debug-agent
```

## Key Points

- **Storage**: System messages are always stored for audit/debugging
- **Hydration**: Controlled by query annotation (opt-in per query)
- **Default**: System messages are NOT hydrated (use current prompt)
- **Audit Trail**: System messages remain in memory for review even if not hydrated

## Viewing Stored System Messages

You can always view stored system messages in the ARK Dashboard memory section, regardless of the annotation setting. The annotation only controls whether they're included in the execution context.

