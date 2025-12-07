# OpenTelemetry Collector

OpenTelemetry Collector for Ark with stdout trace export.

## Quickstart

```bash
devspace dev

devspace deploy

devspace purge
```

### Using Helm

```bash
helm dependency update chart/
helm install otel-collector ./chart -n otel-collector --create-namespace

helm uninstall otel-collector -n otel-collector

kubectl port-forward -n otel-collector svc/otel-collector-opentelemetry-collector 4318:4318
kubectl port-forward -n otel-collector svc/otel-collector-opentelemetry-collector 4317:4317
```

## Configuration

OpenTelemetry Collector is configured with:
- **Namespace**: `otel-collector`
- **Service**: `otel-collector-svc:4318` (HTTP), `otel-collector-svc:4317` (gRPC)
- **OTEL Endpoint**: `http://otel-collector-svc.otel-collector.svc.cluster.local:4318`
- **Export**: Traces, metrics, and logs to stdout via debug exporter

OTEL secrets are automatically created in `ark-system` and `default` namespaces.