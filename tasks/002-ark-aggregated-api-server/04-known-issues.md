# Known Issues

## WATCH Timeout Through kube-apiserver Aggregation (Resolved)

Watch requests to ark-apiserver timeout when proxied through kube-apiserver's aggregation layer. This is a [known Kubernetes limitation](https://github.com/kubernetes/kubernetes/issues/83200).

**Solution:** SplitTransport in ark-controller routes Ark API requests directly to ark-apiserver, bypassing the aggregation proxy. Enable with:

```yaml
arkApiserver:
  enabled: true
  url: https://ark-apiserver.ark-system.svc:443
```

See `ark/internal/transport/split.go` for implementation.
