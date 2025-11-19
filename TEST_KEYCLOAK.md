# Testing Local Keycloak with DevSpace

## Quick Start (One Command)

```bash
./scripts/start-keycloak.sh
```

This will:
- Start Keycloak in Docker
- Automatically configure realm, clients, and test user
- Set everything up for you!

## Manual Setup (Alternative)

If you prefer manual setup:

### Step 1: Start Keycloak

```bash
docker-compose -f docker-compose.keycloak.yml up -d
```

### Step 2: Configure Keycloak

Run the setup script:
```bash
./scripts/setup-keycloak.sh
```

Or configure manually via Admin Console at http://localhost:8080 (admin/admin)

## Step 2: Start DevSpace

```bash
# Start dashboard
cd services/ark-dashboard
devspace dev

# In another terminal, start API
cd services/ark-api
devspace dev
```

## Step 3: Port Forward Dashboard

```bash
kubectl port-forward -n default svc/ark-dashboard 3000:3000
```

## Step 4: Test SSO

1. **Open Dashboard**: http://localhost:3000
2. **You should be redirected to Keycloak login**
3. **Login with**: `testuser` / `test123`
4. **You should be redirected back to dashboard** (authenticated)

## Step 5: Verify API Authentication

```bash
# Get a token from Keycloak (requires jq)
TOKEN=$(curl -s -X POST http://localhost:8090/realms/ark-test/protocol/openid-connect/token \
  -d "client_id=ark-api" \
  -d "username=testuser" \
  -d "password=test123" \
  -d "grant_type=password" | jq -r '.access_token')

# Test API with token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/v1/agents
```

## Troubleshooting

**Check environment variables in pods:**
```bash
# Dashboard
kubectl exec -n default deployment/ark-dashboard-devspace -- env | grep OIDC

# API
kubectl exec -n default deployment/ark-api-devspace -- env | grep OIDC
```

**Note**: The devspace configuration uses `host.docker.internal:8080` so pods can reach Keycloak running on your host. This works with Docker Desktop and most local Kubernetes setups.

**If you're using a different setup** and pods can't reach Keycloak:
```bash
# Option 1: Use your host IP
export OIDC_ISSUER_URL="http://$(hostname -I | awk '{print $1}'):8080/realms/ark-test"
devspace dev

# Option 2: Port-forward Keycloak into cluster
kubectl port-forward -n default svc/keycloak 8080:8080
# Then update OIDC_ISSUER_URL in devspace.yaml to use the service name
```

