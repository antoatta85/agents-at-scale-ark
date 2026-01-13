# ARK Demo Bundle

Pre-configured KYC demo environment with specialized agents and multi-agent teams for customer onboarding.

## What's Included

- **3 KYC Agents**: document-verifier, risk-assessor, compliance-reporter
- **2 KYC Teams**: kyc-verification-team (3 agents), quick-screening-team (2 agents)

## Prerequisites

- Kubernetes cluster running
- ARK controller installed in ark-system namespace
- kubectl and helm installed
- Model configured in ARK

## Install

In the root of the project, run:
```bash
# Run installation script
./install.sh

# Or manually
helm install ark-demo . --namespace default
```

Verify installation:
```bash
kubectl get agents,teams
```

Expected output:
```bash
# agents
agent.ark.mckinsey.com/compliance-reporter
agent.ark.mckinsey.com/document-verifier
agent.ark.mckinsey.com/risk-assessor

# teams
team.ark.mckinsey.com/kyc-verification-team
team.ark.mckinsey.com/quick-screening-team
```
