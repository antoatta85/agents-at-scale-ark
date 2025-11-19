#!/bin/bash
set -e

echo "🚀 Starting Keycloak for ARK..."

# Check if Keycloak is already running
if docker ps | grep -q keycloak; then
  echo "✅ Keycloak is already running"
  echo "   Skipping startup, running setup..."
else
  echo "📦 Starting Keycloak container..."
  docker-compose -f docker-compose.keycloak.yml up -d
  
  # Wait for Keycloak to be ready
  echo "⏳ Waiting for Keycloak to start (this may take 30-60 seconds)..."
  MAX_WAIT=90
  WAITED=0
  until curl -s http://localhost:8090/health/ready > /dev/null 2>&1; do
    if [ $WAITED -ge $MAX_WAIT ]; then
      echo "❌ Keycloak didn't start within $MAX_WAIT seconds"
      echo "   Check logs: docker logs keycloak"
      exit 1
    fi
    echo "   Still waiting... ($WAITED/$MAX_WAIT seconds)"
    sleep 2
    WAITED=$((WAITED + 2))
  done
  echo "✅ Keycloak container is ready!"
fi

echo ""
echo "Running setup script..."
./scripts/setup-keycloak.sh

