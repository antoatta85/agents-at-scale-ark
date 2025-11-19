#!/bin/bash
set -e

echo "🚀 Setting up Keycloak for ARK..."

# Check if Keycloak is running
if ! docker ps | grep -q keycloak; then
  echo "❌ Keycloak container is not running!"
  echo ""
  echo "Please start Keycloak first:"
  echo "  docker-compose -f docker-compose.keycloak.yml up -d"
  echo ""
  echo "Or run the full setup:"
  echo "  ./scripts/start-keycloak.sh"
  exit 1
fi

# Wait for Keycloak to be ready
echo "⏳ Waiting for Keycloak to be ready..."
MAX_WAIT=60
WAITED=0

# Use port 8090 to avoid conflicts with kubectl port-forwards
KEYCLOAK_PORT=8090
KEYCLOAK_URL="http://localhost:${KEYCLOAK_PORT}"

until curl -s ${KEYCLOAK_URL}/health/ready > /dev/null 2>&1; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "❌ Keycloak didn't become ready within $MAX_WAIT seconds"
    echo "   Check if Keycloak is actually running:"
    echo "   docker logs keycloak"
    exit 1
  fi
  echo "   Still waiting... ($WAITED/$MAX_WAIT seconds)"
  sleep 2
  WAITED=$((WAITED + 2))
done

# Wait for admin API to be fully ready
echo "⏳ Waiting for admin API to be ready..."
MAX_WAIT=90
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  TOKEN_TEST=$(curl -s -X POST ${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token \
    -d "client_id=admin-cli" \
    -d "username=admin" \
    -d "password=admin" \
    -d "grant_type=password" 2>&1)
  
  # Check if we got a valid JSON response with access_token
  if echo "$TOKEN_TEST" | jq -e '.access_token' > /dev/null 2>&1; then
    break
  fi
  
  # Check if we got an error that suggests Keycloak isn't ready
  if echo "$TOKEN_TEST" | grep -q "404\|nginx\|Connection refused"; then
    echo "   Still waiting for admin API... ($WAITED/$MAX_WAIT seconds)"
    sleep 2
    WAITED=$((WAITED + 2))
  else
    # Some other error, show it
    echo "   Warning: Got unexpected response, retrying..."
    sleep 2
    WAITED=$((WAITED + 2))
  fi
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo "❌ Admin API didn't become ready within $MAX_WAIT seconds"
  echo "   Check Keycloak logs: docker logs keycloak"
  echo "   Trying to get token anyway..."
fi
echo "✅ Keycloak is ready!"

# Get admin token
echo "🔐 Getting admin token..."
TOKEN_RESPONSE=$(curl -s -X POST ${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password")

if [ $? -ne 0 ] || [ -z "$TOKEN_RESPONSE" ]; then
  echo "❌ Failed to connect to Keycloak. Is it running?"
  exit 1
fi

# Check if response is valid JSON
if ! echo "$TOKEN_RESPONSE" | jq . > /dev/null 2>&1; then
  echo "❌ Keycloak returned invalid JSON. Response:"
  echo "$TOKEN_RESPONSE"
  echo ""
  echo "This might mean Keycloak is still starting up. Try waiting a bit longer."
  exit 1
fi

ADMIN_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty' 2>/dev/null)

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" == "null" ]; then
  echo "❌ Failed to get admin token. Response:"
  echo "$TOKEN_RESPONSE" | jq . 2>/dev/null || echo "$TOKEN_RESPONSE"
  echo ""
  echo "Please check:"
  echo "  - Keycloak is running: curl ${KEYCLOAK_URL}/health/ready"
  echo "  - Admin credentials are correct (admin/admin)"
  echo "  - Try waiting a bit longer if Keycloak just started"
  exit 1
fi

# Set master realm SSL requirement to NONE (for local dev)
echo "🔓 Disabling SSL requirement for master realm (local dev only)..."
curl -s -X PUT ${KEYCLOAK_URL}/admin/realms/master \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sslRequired": "none"
  }' > /dev/null

# Create realm
echo "📦 Creating realm 'ark-test'..."
REALM_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  ${KEYCLOAK_URL}/admin/realms/ark-test)

if [ "$REALM_EXISTS" != "200" ]; then
  curl -s -X POST ${KEYCLOAK_URL}/admin/realms \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "realm": "ark-test",
      "enabled": true,
      "sslRequired": "none"
    }' > /dev/null
  echo "✅ Realm created"
else
  # Update existing realm to disable SSL requirement
  echo "🔓 Disabling SSL requirement for ark-test realm..."
  curl -s -X PUT ${KEYCLOAK_URL}/admin/realms/ark-test \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "sslRequired": "none"
    }' > /dev/null
  echo "✅ Realm already exists (updated SSL requirement)"
fi

# Create dashboard client
echo "📱 Creating dashboard client..."
CLIENT_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  ${KEYCLOAK_URL}/admin/realms/ark-test/clients?clientId=ark-dashboard)

if [ "$CLIENT_EXISTS" != "200" ]; then
  CLIENT_RESPONSE=$(curl -s -X POST ${KEYCLOAK_URL}/admin/realms/ark-test/clients \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "clientId": "ark-dashboard",
      "enabled": true,
      "publicClient": true,
      "standardFlowEnabled": true,
      "redirectUris": ["http://localhost:3000/api/auth/callback/mid", "http://localhost:3000/*", "http://127.0.0.1:3000/api/auth/callback/mid"],
      "webOrigins": ["http://localhost:3000", "http://127.0.0.1:3000", "+"]
    }')
  
  # Update the client to ensure all settings are correct
  CLIENT_ID=$(echo "$CLIENT_RESPONSE" | jq -r '.id // empty' 2>/dev/null)
  if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ]; then
    curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/ark-test/clients/${CLIENT_ID}" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "redirectUris": ["http://localhost:3000/api/auth/callback/mid", "http://localhost:3000/*", "http://127.0.0.1:3000/api/auth/callback/mid"],
        "webOrigins": ["http://localhost:3000", "http://127.0.0.1:3000", "+"]
      }' > /dev/null
  fi
  echo "✅ Dashboard client created"
  # Add audience mapper to include ark-api in tokens
  CLIENT_ID=$(echo "$CLIENT_RESPONSE" | jq -r '.id // empty' 2>/dev/null)
  if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ]; then
    # Check if mapper already exists
    MAPPER_EXISTS=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "${KEYCLOAK_URL}/admin/realms/ark-test/clients/${CLIENT_ID}/protocol-mappers/models" | jq -r '.[] | select(.name == "audience-mapper") | .id // empty' 2>/dev/null)
    if [ -z "$MAPPER_EXISTS" ] || [ "$MAPPER_EXISTS" == "null" ]; then
      curl -s -X POST "${KEYCLOAK_URL}/admin/realms/ark-test/clients/${CLIENT_ID}/protocol-mappers/models" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "name": "audience-mapper",
          "protocol": "openid-connect",
          "protocolMapper": "oidc-audience-mapper",
          "config": {
            "included.client.audience": "ark-api",
            "id.token.claim": "true",
            "access.token.claim": "true"
          }
        }' > /dev/null
      echo "✅ Added audience mapper for ark-api"
    fi
  fi
else
  # Update existing client with correct redirect URIs
  CLIENT_ID=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "${KEYCLOAK_URL}/admin/realms/ark-test/clients?clientId=ark-dashboard" | jq -r '.[0].id // empty' 2>/dev/null)
  if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ]; then
    curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/ark-test/clients/${CLIENT_ID}" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "redirectUris": ["http://localhost:3000/api/auth/callback/mid", "http://localhost:3000/*", "http://127.0.0.1:3000/api/auth/callback/mid"],
        "webOrigins": ["http://localhost:3000", "http://127.0.0.1:3000", "+"]
      }' > /dev/null
    echo "✅ Dashboard client updated with correct redirect URIs"
    # Ensure audience mapper exists
    MAPPER_EXISTS=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" "${KEYCLOAK_URL}/admin/realms/ark-test/clients/${CLIENT_ID}/protocol-mappers/models" | jq -r '.[] | select(.name == "audience-mapper") | .id // empty' 2>/dev/null)
    if [ -z "$MAPPER_EXISTS" ] || [ "$MAPPER_EXISTS" == "null" ]; then
      curl -s -X POST "${KEYCLOAK_URL}/admin/realms/ark-test/clients/${CLIENT_ID}/protocol-mappers/models" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "name": "audience-mapper",
          "protocol": "openid-connect",
          "protocolMapper": "oidc-audience-mapper",
          "config": {
            "included.client.audience": "ark-api",
            "id.token.claim": "true",
            "access.token.claim": "true"
          }
        }' > /dev/null
      echo "✅ Added audience mapper for ark-api"
    fi
  else
    echo "✅ Dashboard client already exists"
  fi
fi

# Create API client
echo "🔌 Creating API client..."
API_CLIENT_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  ${KEYCLOAK_URL}/admin/realms/ark-test/clients?clientId=ark-api)

if [ "$API_CLIENT_EXISTS" != "200" ]; then
  curl -s -X POST ${KEYCLOAK_URL}/admin/realms/ark-test/clients \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "clientId": "ark-api",
      "enabled": true,
      "publicClient": true,
      "standardFlowEnabled": true,
      "directAccessGrantsEnabled": true,
      "redirectUris": ["http://localhost:3000/*"],
      "webOrigins": ["http://localhost:3000"]
    }' > /dev/null
  echo "✅ API client created"
else
  echo "✅ API client already exists"
fi

# Create test user
echo "👤 Creating test user..."
USER_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  ${KEYCLOAK_URL}/admin/realms/ark-test/users?username=testuser)

if [ "$USER_EXISTS" != "200" ]; then
  # Create user
  USER_ID=$(curl -s -X POST ${KEYCLOAK_URL}/admin/realms/ark-test/users \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "username": "testuser",
      "email": "test@example.com",
      "enabled": true,
      "emailVerified": true
    }' | jq -r '.id')
  
  # Set password
  curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/ark-test/users/$USER_ID/reset-password" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "password",
      "value": "test123",
      "temporary": false
    }' > /dev/null
  echo "✅ Test user created (testuser/test123)"
else
  echo "✅ Test user already exists"
fi

echo ""
echo "🎉 Keycloak setup complete!"
echo ""
echo "Realm: ark-test"
echo "Dashboard client: ark-dashboard"
echo "API client: ark-api"
echo "Test user: testuser / test123"
echo ""
echo "Admin console: ${KEYCLOAK_URL}"
echo "Realm URL: ${KEYCLOAK_URL}/realms/ark-test"

