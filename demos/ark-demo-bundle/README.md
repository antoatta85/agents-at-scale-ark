# ARK Demo Bundle

Pre-configured KYC demo with 3 agents, 2 teams, and Argo Workflows for customer onboarding.

## What's Included

- **3 KYC Agents**: document-verifier, risk-assessor, compliance-reporter
- **2 KYC Teams**: kyc-verification-team, quick-screening-team
- **Argo Workflow**: Complete KYC onboarding workflow

## Prerequisites

Before running this demo, your environment must have:

- Kubernetes cluster running
- ARK controller installed (namespace: ark-system)
- kubectl and helm installed
- A Model configured in ARK (name: default)
- Argo Workflows installed with Minio artifact storage enabled

## Install Bundle
The command below will install the ARK demo bundle and also configure the necessary permissions for running Argo Workflows

```bash
./install.sh
```


## Running a Workflow

1. Open Argo UI: http://localhost:2746

2. Click **+ SUBMIT NEW WORKFLOW**

3. Copy the workflow YAML below and paste it into the editor

4. Click **CREATE**

5. Watch the workflow execute

### Workflow YAML
Copy this workflow YAML to the Argo Workflows UI:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: kyc-onboarding-
  annotations:
    workflows.argoproj.io/description: "Complete KYC customer onboarding workflow with document verification, risk assessment, and compliance reporting"
spec:
  entrypoint: main
  serviceAccountName: argo-workflow
  arguments:
    parameters:
      - name: customer-name
        value: "John Michael Smith"
      - name: customer-dob
        value: "March 15, 1985"
      - name: customer-nationality
        value: "United States"
      - name: customer-address
        value: "123 Main Street, New York, NY 10001, USA"
      - name: customer-contact
        value: "+1-555-0123, john.smith@email.com"
      - name: document-passport
        value: "US Passport P123456789, issued 2020-01-15, expires 2030-01-15"
      - name: document-drivers-license
        value: "NY DL #123456789, issued 2019-05-10"
      - name: business-purpose
        value: "Opening personal investment account"
      - name: expected-transactions
        value: "$5,000 - $10,000 monthly deposits"
      - name: source-of-funds
        value: "Employment income (software engineer)"
  templates:
    - name: main
      steps:
        - - name: full-kyc-verification
            template: query-kyc-team
            arguments:
              parameters:
                - name: customer-name
                  value: "{{workflow.parameters.customer-name}}"
                - name: customer-dob
                  value: "{{workflow.parameters.customer-dob}}"
                - name: customer-nationality
                  value: "{{workflow.parameters.customer-nationality}}"
                - name: customer-address
                  value: "{{workflow.parameters.customer-address}}"
                - name: customer-contact
                  value: "{{workflow.parameters.customer-contact}}"
                - name: document-passport
                  value: "{{workflow.parameters.document-passport}}"
                - name: document-drivers-license
                  value: "{{workflow.parameters.document-drivers-license}}"
                - name: business-purpose
                  value: "{{workflow.parameters.business-purpose}}"
                - name: expected-transactions
                  value: "{{workflow.parameters.expected-transactions}}"
                - name: source-of-funds
                  value: "{{workflow.parameters.source-of-funds}}"
        - - name: process-results
            template: process-kyc-results
            arguments:
              parameters:
                - name: kyc-report
                  value: "{{steps.full-kyc-verification.outputs.parameters.response}}"
                - name: customer-name
                  value: "{{workflow.parameters.customer-name}}"

    - name: query-kyc-team
      inputs:
        parameters:
          - name: customer-name
          - name: customer-dob
          - name: customer-nationality
          - name: customer-address
          - name: customer-contact
          - name: document-passport
          - name: document-drivers-license
          - name: business-purpose
          - name: expected-transactions
          - name: source-of-funds
      script:
        image: alpine/k8s:1.28.13
        command: [sh]
        source: |
          set -eux

          QUERY_NAME="kyc-{{workflow.name}}-$(date +%s%N)"

          cat <<'EOF' | sed "s/QUERY_NAME/$QUERY_NAME/" | kubectl apply -n default -f -
          apiVersion: ark.mckinsey.com/v1alpha1
          kind: Query
          metadata:
            name: QUERY_NAME
            labels:
              workflow: "{{workflow.name}}"
              use-case: kyc-onboarding
          spec:
            input: |
              New customer onboarding request:

              Customer Information:
              - Full Name: {{inputs.parameters.customer-name}}
              - Date of Birth: {{inputs.parameters.customer-dob}}
              - Nationality: {{inputs.parameters.customer-nationality}}
              - Residential Address: {{inputs.parameters.customer-address}}
              - Contact: {{inputs.parameters.customer-contact}}

              Documents Provided:
              - {{inputs.parameters.document-passport}}
              - {{inputs.parameters.document-drivers-license}}

              Business Purpose:
              - {{inputs.parameters.business-purpose}}
              - Expected transactions: {{inputs.parameters.expected-transactions}}
              - Source of funds: {{inputs.parameters.source-of-funds}}

              Please perform complete KYC verification and provide onboarding recommendation.
            targets:
              - name: kyc-verification-team
                type: team
            timeout: 5m
            ttl: 24h
          EOF

          kubectl wait --for=condition=Completed --timeout=5m -n default query/$QUERY_NAME || true

          kubectl get query $QUERY_NAME -n default -o json > /tmp/query.json
          PHASE=$(jq -r '.status.phase' /tmp/query.json)

          if [ "$PHASE" = "error" ]; then
            ERROR_MESSAGE=$(jq -r '.status.responses[0].content // .status.error // "Unknown error"' /tmp/query.json)
            echo "$ERROR_MESSAGE"
            exit 1
          fi

          jq -r '.status.responses[0].content // ""' /tmp/query.json | tee /tmp/response.txt
      outputs:
        parameters:
          - name: response
            valueFrom:
              path: /tmp/response.txt

    - name: process-kyc-results
      inputs:
        parameters:
          - name: kyc-report
          - name: customer-name
      script:
        image: alpine:3.19
        command: [sh]
        source: |
          set -e

          echo "================================================================================"
          echo "KYC ONBOARDING WORKFLOW COMPLETE"
          echo "================================================================================"
          echo "Customer: \{{inputs.parameters.customer-name}}"
          echo "Workflow: \{{workflow.name}}"
          echo "Completed: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
          echo ""
          echo "================================================================================"
          echo "FULL KYC COMPLIANCE REPORT"
          echo "================================================================================"
          echo ""
          echo "\{{inputs.parameters.kyc-report}}"
          echo ""
          echo "================================================================================"
          echo "END OF REPORT"
          echo "================================================================================"
```

## View Results

**Option 1: Argo UI**
- Click on the completed workflow
- Go to "Logs" tab
- View the KYC Compliance Report in the `process-results` step

**Option 2: ARK Dashboard**
- Open: http://localhost:3000
- Go to "Queries" in sidebar
- Find the query starting with `kyc-kyc-onboarding-`
- View the formatted report in the "Responses" section

## Workflow Output

The workflow produces a complete KYC Compliance Report including:
- Executive Summary with onboarding decision (APPROVE/REJECT/ESCALATE)
- Customer information and document verification results
- Risk assessment (Low/Medium/High rating)
- PEP screening and sanctions check
- Regulatory compliance status
- Required actions and audit trail

## Troubleshooting

If workflow fails, check:
```bash
# Verify Argo is running
kubectl get pods -n argo-workflows

# Verify agents and teams exist
kubectl get agents,teams -n default

# Verify model exists
kubectl get models -n default
```
