#!/bin/bash

# Script to populate ark-sessions with test data for UI development
# Usage: ./scripts/populate-test-sessions.sh [base_url]
# Default: Uses kubectl port-forward if no URL provided

if [ -z "$1" ]; then
  # Try to use port-forward
  echo "No URL provided, checking for port-forward..."
  if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "Starting port-forward to ark-sessions..."
    kubectl port-forward -n default svc/ark-sessions 8080:80 > /dev/null 2>&1 &
    PORT_FORWARD_PID=$!
    sleep 2
    echo "Port-forward started (PID: $PORT_FORWARD_PID)"
    echo "Run 'kill $PORT_FORWARD_PID' to stop it"
  fi
  BASE_URL="http://localhost:8080"
else
  BASE_URL="$1"
fi

echo "Populating test sessions at $BASE_URL..."
echo ""

# Helper function to create events
create_event() {
  local session_id=$1
  local query_id=$2
  local reason=$3
  local query_name=$4
  local duration_ms=$5
  local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")  # Generate fresh timestamp for each event
  
  # Build JSON payload
  local payload="{
    \"sessionId\": \"$session_id\",
    \"queryId\": \"$query_id\",
    \"reason\": \"$reason\",
    \"queryName\": \"$query_name\",
    \"queryNamespace\": \"default\""
  
  if [ "$duration_ms" != "null" ] && [ -n "$duration_ms" ]; then
    payload="$payload,
    \"durationMs\": $duration_ms"
  fi
  
  payload="$payload,
    \"timestamp\": \"$timestamp\"
  }"
  
  curl -s -X POST "$BASE_URL/v1/events" \
    -H "Content-Type: application/json" \
    -d "$payload" > /dev/null
}

# Helper function to add messages
add_messages() {
  local session_id=$1
  local query_id=$2
  shift 2
  local messages_json="$@"
  
  curl -s -X POST "$BASE_URL/messages" \
    -H "Content-Type: application/json" \
    -d "{
      \"session_id\": \"$session_id\",
      \"query_id\": \"$query_id\",
      \"messages\": [$messages_json]
    }" > /dev/null
}

# Session 1: Simple completed query with conversation
echo "Creating session-1: Simple completed query..."
SESSION_1="test-session-1"
create_event "$SESSION_1" "query-1" "QueryStart" "Simple Query" "null"
add_messages "$SESSION_1" "query-1" \
  '{"role": "user", "content": "What is the capital of France?"}' \
  '{"role": "assistant", "content": "The capital of France is Paris."}'
create_event "$SESSION_1" "query-1" "QueryComplete" "Simple Query" "1250.5"
echo "  ✓ Created $SESSION_1"

# Session 2: Multiple queries in one session
echo "Creating session-2: Multiple queries..."
SESSION_2="test-session-2"

# Query 1
create_event "$SESSION_2" "query-2a" "QueryStart" "Weather Query" "null"
add_messages "$SESSION_2" "query-2a" \
  '{"role": "user", "content": "What is the weather today?"}' \
  '{"role": "assistant", "content": "I cannot check real-time weather, but I can help you find weather information."}'
create_event "$SESSION_2" "query-2a" "QueryComplete" "Weather Query" "2100.0"

# Query 2
create_event "$SESSION_2" "query-2b" "QueryStart" "Math Query" "null"
add_messages "$SESSION_2" "query-2b" \
  '{"role": "user", "content": "Calculate 15 * 23"}' \
  '{"role": "assistant", "content": "15 * 23 = 345"}'
create_event "$SESSION_2" "query-2b" "QueryComplete" "Math Query" "850.25"

# Standalone conversation (no query_id)
add_messages "$SESSION_2" "" \
  '{"role": "user", "content": "This is a standalone message"}' \
  '{"role": "assistant", "content": "This is a standalone response"}'
echo "  ✓ Created $SESSION_2"

# Session 3: In-progress query (no QueryComplete event)
echo "Creating session-3: In-progress query..."
SESSION_3="test-session-3"
create_event "$SESSION_3" "query-3" "QueryStart" "Long Running Query" "null"
add_messages "$SESSION_3" "query-3" \
  '{"role": "user", "content": "This query is still running..."}' \
  '{"role": "assistant", "content": "Processing your request..."}'
echo "  ✓ Created $SESSION_3 (in-progress)"

# Session 4: Complex query with multiple conversation turns
echo "Creating session-4: Complex multi-turn conversation..."
SESSION_4="test-session-4"
create_event "$SESSION_4" "query-4" "QueryStart" "Complex Query" "null"
add_messages "$SESSION_4" "query-4" \
  '{"role": "user", "content": "Tell me about Python"}' \
  '{"role": "assistant", "content": "Python is a high-level programming language..."}' \
  '{"role": "user", "content": "What are its main features?"}' \
  '{"role": "assistant", "content": "Python features include: readability, dynamic typing, and a large standard library."}' \
  '{"role": "user", "content": "Give me an example"}' \
  '{"role": "assistant", "content": "Here is a simple example: print(\"Hello, World!\")"}'
create_event "$SESSION_4" "query-4" "QueryComplete" "Complex Query" "3500.75"
echo "  ✓ Created $SESSION_4"

# Session 5: Empty session (no queries, just standalone messages)
echo "Creating session-5: Empty session with standalone messages..."
SESSION_5="test-session-5"
add_messages "$SESSION_5" "" \
  '{"role": "user", "content": "Hello"}' \
  '{"role": "assistant", "content": "Hi there!"}'
echo "  ✓ Created $SESSION_5"

echo ""
echo "✅ Test sessions created successfully!"
echo ""
echo "Sessions created:"
echo "  - $SESSION_1 (1 completed query)"
echo "  - $SESSION_2 (2 completed queries + standalone conversation)"
echo "  - $SESSION_3 (1 in-progress query)"
echo "  - $SESSION_4 (1 complex multi-turn query)"
echo "  - $SESSION_5 (standalone messages only)"
echo ""
echo "View sessions in dashboard:"
echo "  http://localhost:3000/sessions"
echo ""
echo "Or via API:"
echo "  curl $BASE_URL/sessions"
echo "  curl $BASE_URL/sessions/$SESSION_1"

