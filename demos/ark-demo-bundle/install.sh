#!/bin/bash
set -e

echo "Installing ARK Demo Bundle"

if helm list -n default | grep -q ark-demo; then
    helm upgrade ark-demo . --namespace default
else
    helm install ark-demo . --namespace default
fi

echo ""
echo "Configuring Argo Workflows permissions"
kubectl apply -f examples/argo-workflow-rbac.yaml

echo ""
echo "Installation complete"
echo ""
kubectl get agents,teams -n default
