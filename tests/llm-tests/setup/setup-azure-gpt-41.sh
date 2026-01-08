#!/bin/bash
set -e

NAMESPACE="${1:?}"

kubectl apply -n "$NAMESPACE" -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: test-model-token
type: Opaque
stringData:
  token: ${E2E_TEST_AZURE_OPENAI_KEY:?}
EOF

kubectl wait --for=jsonpath='{.metadata.name}'=test-model-token secret/test-model-token -n "$NAMESPACE" --timeout=30s

kubectl apply -n "$NAMESPACE" -f - <<EOF
apiVersion: ark.mckinsey.com/v1alpha1
kind: Model
metadata:
  name: test-model
spec:
  type: azure
  model:
    value: gpt-4o-mini
  config:
    azure:
      baseUrl:
        value: ${E2E_TEST_AZURE_OPENAI_BASE_URL:?}
      apiKey:
        valueFrom:
          secretKeyRef:
            name: test-model-token
            key: token
      apiVersion:
        value: ${E2E_TEST_AZURE_OPENAI_API_VERSION:-2024-12-01-preview}
EOF
