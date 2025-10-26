# Testing System Message Hydration

This demonstrates the difference between hydrating and not hydrating system messages from memory.

## Setup

1. Make sure you have a default memory resource:
```bash
kubectl get memory default -n default
```

If it doesn't exist, create it (check ark/config/samples/memories).

## Test Flow

### Step 1: Create Agent
```bash
kubectl apply -f samples/queries/test-system-messages/01-agent.yaml
```

### Step 2: First Query - Introduce Name
```bash
kubectl apply -f samples/queries/test-system-messages/02-query-1.yaml

# Wait for completion
kubectl get query query-1-introduce-name -w

# Check response
kubectl get query query-1-introduce-name -o jsonpath='{.status.responses[0].content}'
```

Expected: Agent responds acknowledging Alice's name.

### Step 3a: Test WITHOUT Hydration (Default Behavior)

```bash
kubectl apply -f samples/queries/test-system-messages/03-query-2-without-hydration.yaml

# Wait for completion
kubectl get query query-2-ask-name-without-hydration -w

# Check response
kubectl get query query-2-ask-name-without-hydration -o jsonpath='{.status.responses[0].content}'
```

Expected: Agent remembers Alice's name from the conversation history.

**Key point**: The agent's CURRENT prompt is used, but the conversation context (including the memory) allows it to remember Alice's name.

### Step 3b: Test WITH Hydration

```bash
kubectl apply -f samples/queries/test-system-messages/04-query-2-with-hydration.yaml

# Wait for completion
kubectl get query query-2-ask-name-with-hydration -w

# Check response
kubectl get query query-2-ask-name-with-hydration -o jsonpath='{.status.responses[0].content}'
```

Expected: Same response - agent remembers Alice's name.

**Key point**: The HISTORIC system message from memory is used. In this case, both approaches produce the same result, but in scenarios where the agent's prompt has changed, you'd see a difference.

## Inspecting Memory Storage

To see what's actually stored in memory (including system messages):

### Via Dashboard
1. Open ARK Dashboard
2. Navigate to Memory section
3. Filter by session: `test-session-123`
4. You'll see all messages including the system message

### Via API
```bash
# Get memory messages for the session
curl -X GET "http://ark-api.default.svc.cluster.local/api/v1/memory-messages?session=test-session-123"
```

## Expected Memory Contents

After running the queries, memory should contain:

```
1. [system] "You are a helpful assistant that remembers names..."
2. [user] "Hi, my name is Alice"
3. [assistant] "Hello Alice! I'll remember your name..."
```

**Note**: System message is ALWAYS stored, regardless of the annotation. The annotation only controls whether it's loaded back.

## When the Annotation Matters: Agent Prompt Changed Scenario

The annotation matters when the agent's prompt has been updated since the conversation started.

### Scenario: Agent Prompt Changed After Conversation Started

Let's say you started a conversation on October 1st with this agent:
```yaml
prompt: "You are a helpful assistant that remembers names."
```

You had several conversations with Alice, Bob, and Charlie.

Then on October 15th, someone updates the agent to:
```yaml
prompt: "You are a coding assistant that helps with Python programming."
```

Now when users come back with follow-up queries:

#### WITHOUT Annotation (Default):
- Agent uses the NEW prompt ("coding assistant")
- Previous context is lost
- Agent can't remember Alice, Bob, Charlie
- "I'm a coding assistant, I don't know who Alice is"

#### WITH Annotation:
- Agent uses the OLD prompt from memory ("remembers names")
- Previous context is preserved
- Agent remembers Alice, Bob, Charlie
- Conversation continuity maintained

### Why This Matters

This is useful when:
1. **Debugging conversations**: You want to use the exact prompt the conversation started with
2. **Agent updates mid-conversation**: Protect users from losing context
3. **Audit compliance**: Ensure conversations use the prompt version that was active at the time
4. **Testing**: Verify behavior with historical prompts

### In the Current Test

The current test doesn't show the difference because:
- Agent prompt hasn't changed between queries
- Both approaches use the same prompt (current one)
- The only difference is WHERE the prompt comes from (current vs memory)

To see the real difference, you'd need to:
1. Start a conversation with prompt A
2. Update the agent to prompt B
3. Continue conversation
   - WITHOUT annotation: uses prompt B (current)
   - WITH annotation: uses prompt A (from memory)

