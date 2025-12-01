#!/bin/bash
set -e

echo "=== Running Multi-Provider LLM Tests ==="

MODELS=()
FAILED_MODELS=()
PASSED_MODELS=()

# Check which providers are configured
if [ -n "${E2E_TEST_AZURE_OPENAI_KEY}" ] && [ -n "${E2E_TEST_AZURE_OPENAI_BASE_URL}" ]; then
  MODELS+=("azure-gpt-41")
  echo "✓ Azure OpenAI configured"
else
  echo "⊘ Azure OpenAI not configured (missing credentials)"
fi

if [ -n "${E2E_TEST_OPENAI_API_KEY}" ]; then
  MODELS+=("openai-gpt-4o")
  echo "✓ OpenAI configured"
else
  echo "⊘ OpenAI not configured (missing credentials)"
fi

if [ ${#MODELS[@]} -eq 0 ]; then
  echo "ERROR: No model providers configured. Set at least one of:"
  echo "  - E2E_TEST_AZURE_OPENAI_KEY + E2E_TEST_AZURE_OPENAI_BASE_URL"
  echo "  - E2E_TEST_OPENAI_API_KEY"
  exit 1
fi

echo ""
echo "Running tests for ${#MODELS[@]} provider(s): ${MODELS[*]}"
echo ""

mkdir -p /tmp/chainsaw-report

for MODEL in "${MODELS[@]}"; do
  echo "========================================"
  echo "Testing with MODEL=$MODEL"
  echo "========================================"
  
  export MODEL
  
  if chainsaw test llm-tests/ --config .chainsaw.yaml; then
    echo "✓ $MODEL tests PASSED"
    PASSED_MODELS+=("$MODEL")
  else
    echo "✗ $MODEL tests FAILED"
    FAILED_MODELS+=("$MODEL")
  fi
  
  echo ""
done

echo "========================================"
echo "Test Summary"
echo "========================================"
echo "Passed: ${#PASSED_MODELS[@]}/${#MODELS[@]}"
for model in "${PASSED_MODELS[@]}"; do
  echo "  ✓ $model"
done

if [ ${#FAILED_MODELS[@]} -gt 0 ]; then
  echo "Failed: ${#FAILED_MODELS[@]}/${#MODELS[@]}"
  for model in "${FAILED_MODELS[@]}"; do
    echo "  ✗ $model"
  done
  echo ""
  echo "ERROR: Some tests failed"
  exit 1
fi

echo ""
echo "SUCCESS: All tests passed!"
exit 0

