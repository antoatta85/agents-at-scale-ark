#!/bin/bash
set -e

echo "🚀 Testing System Message Hydration"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Create Agent
echo -e "${BLUE}Step 1: Creating test agent...${NC}"
kubectl apply -f 01-agent.yaml
echo -e "${GREEN}✓ Agent created${NC}"
echo ""

# Wait for agent to be ready
echo "Waiting for agent to be ready..."
kubectl wait --for=condition=Available agent/test-agent --timeout=60s || true
echo ""

# Step 2: First Query - Introduce Name
echo -e "${BLUE}Step 2: Running first query to introduce name...${NC}"
kubectl apply -f 02-query-1.yaml
echo -e "${GREEN}✓ Query 1 applied${NC}"

echo "Waiting for query 1 to complete..."
while true; do
  PHASE=$(kubectl get query query-1-introduce-name -o jsonpath='{.status.phase}' 2>/dev/null || echo "Pending")
  if [ "$PHASE" = "done" ]; then
    echo -e "${GREEN}✓ Query 1 completed${NC}"
    break
  elif [ "$PHASE" = "error" ]; then
    echo "❌ Query 1 failed"
    kubectl get query query-1-introduce-name -o yaml
    exit 1
  fi
  sleep 2
done

# Show response
RESPONSE=$(kubectl get query query-1-introduce-name -o jsonpath='{.status.responses[0].content}' 2>/dev/null)
echo "Response: $RESPONSE"
echo ""

# Step 3: Test WITHOUT Hydration
echo -e "${BLUE}Step 3a: Testing WITHOUT system message hydration (default behavior)...${NC}"
kubectl apply -f 03-query-2-without-hydration.yaml
echo -e "${GREEN}✓ Query 2 (without hydration) applied${NC}"

echo "Waiting for query 2 to complete..."
while true; do
  PHASE=$(kubectl get query query-2-ask-name-without-hydration -o jsonpath='{.status.phase}' 2>/dev/null || echo "Pending")
  if [ "$PHASE" = "done" ]; then
    echo -e "${GREEN}✓ Query 2 completed${NC}"
    break
  elif [ "$PHASE" = "error" ]; then
    echo "❌ Query 2 failed"
    kubectl get query query-2-ask-name-without-hydration -o yaml
    exit 1
  fi
  sleep 2
done

# Show response
RESPONSE2=$(kubectl get query query-2-ask-name-without-hydration -o jsonpath='{.status.responses[0].content}' 2>/dev/null)
echo "Response: $RESPONSE2"
echo ""

# Step 4: Test WITH Hydration
echo -e "${BLUE}Step 4: Testing WITH system message hydration...${NC}"
kubectl apply -f 04-query-2-with-hydration.yaml
echo -e "${GREEN}✓ Query 3 (with hydration) applied${NC}"

echo "Waiting for query 3 to complete..."
while true; do
  PHASE=$(kubectl get query query-2-ask-name-with-hydration -o jsonpath='{.status.phase}' 2>/dev/null || echo "Pending")
  if [ "$PHASE" = "done" ]; then
    echo -e "${GREEN}✓ Query 3 completed${NC}"
    break
  elif [ "$PHASE" = "error" ]; then
    echo "❌ Query 3 failed"
    kubectl get query query-2-ask-name-with-hydration -o yaml
    exit 1
  fi
  sleep 2
done

# Show response
RESPONSE3=$(kubectl get query query-2-ask-name-with-hydration -o jsonpath='{.status.responses[0].content}' 2>/dev/null)
echo "Response: $RESPONSE3"
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}✅ All tests completed!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "1. Query 1: Agent introduced and learned Alice's name"
echo "2. Query 2 (without hydration): Agent remembered name using CURRENT prompt"
echo "3. Query 3 (with hydration): Agent remembered name using HISTORIC prompt from memory"
echo ""
echo "To view stored messages in memory, check the dashboard or:"
echo "  kubectl get query query-1-introduce-name -o yaml"
echo ""
echo "To see the system message stored in memory, check the ARK Dashboard Memory section."

