# ClickHouse

ClickHouse database for Ark telemetry storage.

## Quickstart

```bash
devspace dev

devspace deploy

devspace purge
```

### Using Helm

```bash
helm install clickhouse ./chart -n clickhouse --create-namespace

helm uninstall clickhouse -n clickhouse

kubectl port-forward -n clickhouse svc/clickhouse-svc 8123:8123
kubectl port-forward -n clickhouse svc/clickhouse-svc 9000:9000
```

## Configuration

ClickHouse is configured with:
- **Namespace**: `clickhouse`
- **Service**: `clickhouse-svc`
- **Ports**:
  - HTTP API: `8123`
  - Native TCP: `9000`
  - Interserver: `9009`
- **Persistence**: 10Gi PVC at `/var/lib/clickhouse`
- **Resources**: 2 CPU / 4Gi memory (limits), 500m CPU / 1Gi memory (requests)

## Testing Connection

```bash
kubectl run -it --rm clickhouse-client \
  --image=clickhouse/clickhouse-client \
  --restart=Never \
  -- clickhouse-client --host clickhouse-svc.clickhouse.svc.cluster.local
```

## Environment Variables

- `CLICKHOUSE_USER`: Database user (default: `default`)
- `CLICKHOUSE_PASSWORD`: User password (default: empty)
- `CLICKHOUSE_DB`: Default database to create (default: `default`)
- `CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT`: Enable access management (default: `0`)