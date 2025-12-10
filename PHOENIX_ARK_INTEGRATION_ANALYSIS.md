# Phoenix Integration with ARK: Analysis & Comparison

---

## Table of Contents

- [Feature Comparison](#feature-comparison-phoenix-vs-ark-native-evals)
- [When to Use What](#when-to-use-what)
- [Integration Architecture](#recommended-integration-architecture)
- [Recommendations](#recommendations)

---

## Feature Comparison: Phoenix vs ARK Native Evals

### Evaluation Capabilities

| Capability | ARK Native Evals | Phoenix |
|------------|------------------|---------|
| **LLM-as-Judge** | ✅ Relevance, Accuracy, Clarity, Completeness, Usefulness | ✅ Similar + custom templates |
| **Deterministic Metrics** | ✅ Token, Cost, Performance, Quality scores | ❌ Focus is on LLM-based evals |
| **RAG Evaluation** | ✅ Via RAGAS provider | ✅ Retrieval relevance, context precision |
| **Hallucination Detection** | ❌ Not a dedicated metric | ✅ **Specialized hallucination evaluator** |
| **Function Calling Eval** | ❌ Not available | ✅ **Function call correctness** |
| **Toxicity Detection** | ❌ Not available | ✅ **Content safety evaluators** |
| **Custom Evaluators** | ✅ Extensible providers | ✅ **Bring-your-own evaluator** |

### Architecture

| Aspect | ARK Native Evals | Phoenix |
|--------|------------------|---------|
| **Kubernetes Native** | ✅ CRD-based (Evaluator, Query resources) | ❌ Separate service |
| **OpenTelemetry** | ✅ Full OTEL support | ✅ OpenInference standard |
| **Event-Based Eval** | ✅ K8s event analysis for tool/agent flows | ❌ Trace-based only |
| **API-First** | ✅ REST endpoints | ✅ REST + SDK |
| **Self-Hosted** | ✅ Kubernetes deployment | ✅ Docker/Kubernetes |

### Observability & Tooling

| Feature | ARK Native Evals | Phoenix |
|---------|------------------|---------|
| **Tracing** | ✅ Via external backends | ✅ **Built-in trace UI** |
| **Prompt Playground** | ❌ Not included | ✅ **Interactive debugging** |
| **Dataset Management** | ❌ External | ✅ **Built-in datasets** |
| **Experiment Tracking** | ❌ External | ✅ **Native experiments** |
| **Visualization** | ❌ Via dashboard | ✅ **Rich trace visualization** |

### ARK-Specific Unique Features

| Feature | Description |
|---------|-------------|
| **Query CRD Integration** | Native ARK resource references (`queryRef`, `agentRef`) |
| **Kubernetes Events** | Semantic event analysis for tool, agent, team workflows |
| **Baseline Comparison** | Compare current responses against known good baselines |
| **Batch Evaluation** | Aggregate results from multiple evaluations |
| **Model Resolution** | Automatic model configuration from ARK Model CRDs |
| **Event Rules DSL** | Expression-based rules for event evaluation |

### Phoenix-Specific Unique Features

| Feature | Description |
|---------|-------------|
| **Hallucination Evaluator** | Specialized, battle-tested hallucination detection |
| **Prompt Playground** | Interactive sandbox for prompt iteration |
| **Trace Visualization** | Rich UI for exploring LLM traces and spans |
| **Dataset Curation** | Built-in tools for managing evaluation datasets |
| **Experiment Versioning** | Track prompt/model experiments over time |

---

## When to Use What

### Use ARK Native Evals When:

1. **Kubernetes-native workflows**
   - You want evaluations as part of Query CRDs with automatic lifecycle management
   - Evaluations need to reference ARK Agents, Teams, or Models by name
   
2. **Deterministic KPIs**
   - Token efficiency tracking
   - Cost per query metrics
   - Latency and performance monitoring
   
3. **Event-based assertions**
   - Testing tool usage patterns
   - Validating agent interaction sequences
   - Asserting team workflow behaviors
   
4. **Baseline comparisons**
   - Regression testing against known good responses
   - A/B testing different model configurations
   
5. **Production gates**
   - Automated quality gates in CI/CD
   - SLA compliance monitoring

### Use Phoenix When:

1. **Hallucination detection**
   - Phoenix has specialized, production-tested hallucination evaluators
   - Critical for RAG applications where factual accuracy matters
   
2. **Interactive debugging**
   - Prompt playground for rapid iteration
   - Trace visualization for understanding LLM behavior
   
3. **Experimentation**
   - Running A/B tests with version tracking
   - Prompt engineering with experiment history
   
4. **Function calling evaluation**
   - Assessing tool/function call correctness
   - Validating structured output generation
   
5. **Pre-production iteration**
   - Fast local experimentation before deploying to ARK
   - Exploratory data analysis on model outputs
   
6. **Dataset curation**
   - Building and managing evaluation datasets with UI
   - Annotating examples for fine-tuning

### Use Both Together When:

1. **Full pipeline observability + evaluation**
   - Phoenix for tracing and visualization
   - ARK for CRD-based evaluation orchestration
   
2. **Production monitoring with deep debugging**
   - ARK for automated quality checks and alerts
   - Phoenix for drill-down analysis when issues arise
   
3. **Development to production pipeline**
   - Phoenix for development and experimentation
   - ARK evals for production quality gates
   
4. **Complementary metrics**
   - ARK for deterministic metrics (cost, tokens, latency)
   - Phoenix for LLM-based quality metrics (hallucination, relevance)

---

## Recommended Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARK Evaluation Pipeline                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │ ARK Evaluator   │    │ Phoenix Service │                     │
│  │  (/evaluate)    │    │ (Marketplace)   │                     │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                               │
│  ┌────────▼────────┐    ┌────────▼────────┐                     │
│  │ Native Providers│    │ OSS Providers   │                     │
│  │ • direct        │    │ • ragas ✅      │                     │
│  │ • query         │    │ • langfuse ✅   │                     │
│  │ • baseline      │    │ • phoenix 🔜    │  ◄── Future         │
│  │ • event         │    │ • opik 🔜       │      Integration    │
│  │ • batch         │    │ • deepeval 🔜   │                     │
│  └─────────────────┘    └─────────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              OpenTelemetry / Traces / Observability             │
│   Phoenix (OpenInference) ◄───────► Langfuse ◄───────► Others   │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Configuration

```yaml
# Example: Using Phoenix for both tracing and evaluation
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-environment-variables
  namespace: ark-system
data:
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://phoenix.phoenix:6006/v1/traces"
  OTEL_SERVICE_NAME: "ark-controller"
---
# Phoenix deployed via marketplace
# ark install marketplace/services/phoenix
```

---

## Recommendations

### For Immediate Use

Phoenix works great today as an **observability backend** (tracing):

1. Deploy Phoenix from the ARK Marketplace:
   ```bash
   ark install marketplace/services/phoenix
   ```

2. Configure OTEL environment variables:
   ```yaml
   OTEL_EXPORTER_OTLP_ENDPOINT: "http://phoenix:6006/v1/traces"
   ```

3. Restart ARK components to pick up the configuration

### For Evaluation (Current Options)

Since Phoenix evaluation is not yet integrated:

1. **Use Phoenix standalone alongside ARK**
   - Run Phoenix evaluations via its Python SDK
   - Use ARK evaluations for Kubernetes-native workflows
   
2. **Use RAGAS provider** (already integrated)
   - Many metrics overlap with Phoenix capabilities
   - Works seamlessly with ARK's evaluation framework

3. **Implement custom Phoenix provider**
   - Follow the RAGAS provider pattern
   - Contribute back to the project

### Future Integration Request

To request Phoenix evaluation integration, open a GitHub issue with:

```markdown
## Feature Request: Phoenix Evaluation Provider

### Use Case
- Hallucination detection for RAG pipelines
- Function calling evaluation
- Integration with existing Phoenix traces

### Proposed Configuration
```yaml
parameters:
  provider: "phoenix"
  phoenix.host: "http://phoenix:6006"
  metrics: "hallucination,qa_correctness"
```

### Benefits
- Leverage existing Phoenix tracing data for evaluation
- Access to battle-tested hallucination evaluators
- Unified observability and evaluation in one tool
```

---

## References

- [ARK Evaluator Documentation](../services/ark-evaluator/README.md)
- [ARK Evaluator Roadmap](../services/ark-evaluator/docs/roadmap.md)
- [Phoenix Documentation](https://phoenix.arize.com/)
- [Phoenix Evaluation Guide](https://arize.com/docs/phoenix/evaluation/llm-evals)
- [OpenInference Specification](https://github.com/Arize-ai/openinference)

---

*Last updated: December 2024*

