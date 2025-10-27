# Test: System Message Hydration

This demonstrates the difference between using the **current agent prompt** vs the **historic prompt from memory**.

## Overview

When you have conversations with an agent:
- The system message is **always stored** in memory
- Based on query setting, you can choose:
  - **Without annotation**: Use agent's CURRENT system message
  - **With annotation**: Use the STORED system message from memory (historic)

## Test Scenario

Agent prompt changes mid-conversation, showing the difference between hydration and no hydration.

## Step-by-Step Test

### Step 1: Create the Agent (Math Teacher)

```bash
kubectl apply -f 01-create-agent.yaml
```

This creates an agent with prompt: "You are a math teacher helping with algebra."

### Step 2: Start Conversation (Store System Message)

```bash
kubectl apply -f 02-start-conversation.yaml
```

This query will:
- Say: "I'm learning quadratic equations"
- System message is STORED in memory

### Step 3: Update Agent Prompt (Simulate Agent Update)

```bash
kubectl patch agent test-hydration-agent --type='json' -p='[{"op": "replace", "path": "/spec/prompt", "value": "You are a coding instructor helping students with Python programming. You explain programming concepts and debug code."}]'
```

Agent prompt changes to: "You are a coding instructor helping with Python."

### Step 4: Test WITHOUT Hydration (Uses New Prompt)

```bash
kubectl apply -f 04-query-without-hydration.yaml
```

**Result**: Agent uses NEW prompt (coding instructor) - context about algebra might be lost

### Step 5: Test WITH Hydration (Uses Historic Prompt)

```bash
kubectl apply -f 05-query-with-hydration.yaml
```

**Result**: Agent uses OLD prompt (math teacher) - context preserved

## Expected Output

The agent responses should be DIFFERENT because:
- Without hydration: Uses "coding instructor" prompt
- With hydration: Uses "math teacher" prompt from memory

## Cleanup

```bash
# Clean up test queries
kubectl delete query start-conversation \
  query-without-hydration \
  query-with-hydration \
  -n default

# Clean up agent
kubectl delete agent test-hydration-agent -n default
```

## Key Insight

This feature is useful when:
1. **Agent prompts change** mid-conversation
2. You want to preserve the original context
3. You need audit trails of which prompt was used
4. You're doing A/B testing of prompts

