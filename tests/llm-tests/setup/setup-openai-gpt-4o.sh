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
  token: ${E2E_TEST_OPENAI_API_KEY:?}
---
apiVersion: ark.mckinsey.com/v1alpha1
kind: Model
metadata:
  name: test-model
spec:
  type: openai
  model:
    value: gpt-4o-mini
  config:
    openai:
      baseUrl:
        value: ${E2E_TEST_OPENAI_BASE_URL:-https://api.openai.com/v1}
      apiKey:
        valueFrom:
          secretKeyRef:
            name: test-model-token
            key: token
EOF
