# LLM Tests

Tests that call real language model APIs to validate Ark functionality across different LLM providers.

## Running Locally

```bash
# Set credentials for your provider
export E2E_TEST_AZURE_OPENAI_KEY="your-key"
export E2E_TEST_AZURE_OPENAI_BASE_URL="your-url"

# Run all LLM tests with a specific model
MODEL=azure-gpt-41 chainsaw test tests/llm-tests/

# Run a specific test
MODEL=openai-gpt-4o chainsaw test tests/llm-tests/basic-agent/
```

## Available Models

- `azure-gpt-41` - Azure OpenAI GPT-4.1-mini
  - Requires: `E2E_TEST_AZURE_OPENAI_KEY`, `E2E_TEST_AZURE_OPENAI_BASE_URL`
- `openai-gpt-4o` - OpenAI GPT-4o-mini
  - Requires: `E2E_TEST_OPENAI_API_KEY`
- `bedrock-claude` - AWS Bedrock Claude 3.5 Sonnet
  - Requires: `E2E_TEST_BEDROCK_BEARER_TOKEN`, `E2E_TEST_BEDROCK_REGION`

## Structure

Each test calls a setup script to create the model, then runs test-specific manifests:

```
llm-tests/
├── setup/                  # Model setup scripts
│   ├── setup-azure-gpt-41.sh
│   ├── setup-openai-gpt-4o.sh
│   └── setup-bedrock-claude.sh
├── basic-agent/           # Test: Basic agent creation
├── tool-usage/            # Test: Agent with tools
└── structured-output/     # Test: Structured output
```

See `tests/CLAUDE.md` for detailed documentation.
