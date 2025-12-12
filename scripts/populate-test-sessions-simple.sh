#!/bin/bash

# Simple version that works with current deployment (messages only, no events)
# This creates sessions with messages but no queries (since POST /v1/events isn't deployed yet)

BASE_URL="${1:-http://localhost:8080}"

# Check if port-forward is needed
if [[ "$BASE_URL" == "http://localhost:8080" ]]; then
  if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "Starting port-forward to ark-sessions..."
    kubectl port-forward -n default svc/ark-sessions 8080:80 > /dev/null 2>&1 &
    sleep 2
  fi
fi

echo "Populating test sessions (messages only) at $BASE_URL..."
echo "Note: This creates sessions with messages but no queries (events endpoint not deployed yet)"
echo ""

# Session with messages
curl -s -X POST "$BASE_URL/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-simple-1",
    "messages": [
      {"role": "user", "content": "Hello"},
      {"role": "assistant", "content": "Hi! How can I help?"}
    ]
  }' > /dev/null
echo "✓ Created test-session-simple-1"

# Session with multiple messages
curl -s -X POST "$BASE_URL/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-simple-2",
    "messages": [
      {"role": "user", "content": "What is 2+2?"},
      {"role": "assistant", "content": "2+2 equals 4."},
      {"role": "user", "content": "What about 3+3?"},
      {"role": "assistant", "content": "3+3 equals 6."}
    ]
  }' > /dev/null
echo "✓ Created test-session-simple-2"

echo ""
echo "✅ Test sessions created!"
echo "View at: http://localhost:3000/sessions"
echo ""
echo "To create sessions with queries, deploy the POST /v1/events endpoint first."

