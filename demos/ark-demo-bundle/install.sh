#!/bin/bash
set -e

echo "Installing ARK Demo Bundle"

if helm list | grep -q ark-demo; then
    helm upgrade ark-demo . --namespace default
else
    helm install ark-demo . --namespace default
fi

echo ""
echo "Installation complete"
echo ""
kubectl get agents,teams
