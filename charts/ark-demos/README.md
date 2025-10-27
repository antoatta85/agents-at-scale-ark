# ARK Demos Helm Chart

This Helm chart deploys ARK demo agents and tools for new user onboarding, showcasing different complexity levels and ARK capabilities.

## Quick Start

### Using ARK CLI

```bash
# Install all demos (interactive selection)
ark demos

# Install all demos non-interactively
ark demos --all

# Install specific demos
ark demos --math
ark demos --weather
ark demos --research

# Combine demos
ark demos --math --weather

# Custom namespace
ark demos --all -n my-demos

# Uninstall demos
ark demos uninstall
```

### Using Helm directly

```bash
# Install all demos (default namespace for dashboard visibility)
helm install ark-demos ./charts/ark-demos -n default

# Install only math demo
helm install ark-demos ./charts/ark-demos \
  --set demos.weather.enabled=false \
  --set demos.research.enabled=false \
  -n default

# Install only weather demo
helm install ark-demos ./charts/ark-demos \
  --set demos.math.enabled=false \
  --set demos.research.enabled=false \
  -n default
```

### Using Installation Script

```bash
# Install all demos
./charts/ark-demos/install.sh

# Install specific demos
./charts/ark-demos/install.sh --math-only
./charts/ark-demos/install.sh --weather-only
./charts/ark-demos/install.sh --research-only

# Custom model configuration
./charts/ark-demos/install.sh -m openai -v gpt-4
```

## Included Demos

### 1. Math Demo (Beginner)
**Complexity**: Beginner  
**Shows**: Basic agent creation, simple prompts, query execution

- **Agent**: `math-agent` - Simple math assistant
- **Query**: `math-query` - Calculate 2+2 and explain
- **Use Case**: Perfect for first-time ARK users to understand basic concepts

### 2. Weather Demo (Intermediate)
**Complexity**: Intermediate  
**Shows**: Multi-agent workflows, tool integration, MCP file operations

- **Agents**: 
  - `weather-fetcher` - Fetches weather data via API
  - `weather-storage` - Stores data to filesystem via MCP
- **Team**: `weather-workflow-team` - Sequential workflow
- **Tools**: Weather API, file system MCP tools
- **Query**: `weather-query` - Get weather for Chicago and save to file
- **Use Case**: Shows real-world tool integration and data persistence

### 3. Research Demo (Advanced)
**Complexity**: Advanced  
**Shows**: Multi-agent teams, web search, file operations, sequential workflows

- **Agents**:
  - `researcher` - Web search and information gathering
  - `analyst` - Data analysis and insight generation
  - `creator` - Document creation and file management
- **Team**: `research-analysis-team` - 3-agent sequential workflow
- **Tools**: Web search API, file system MCP tools
- **Query**: `research-query` - Research AI trends and create report
- **Use Case**: Demonstrates ARK's enterprise capabilities for complex workflows

## Configuration

### Demo Selection

```yaml
demos:
  math:
    enabled: true
    name: "math-demo"
    complexity: "beginner"
    category: "basic"
    
  weather:
    enabled: true
    name: "weather-demo"
    complexity: "intermediate"
    category: "workflow"
    
  research:
    enabled: true
    name: "research-demo"
    complexity: "advanced"
    category: "team"
```

### Model Configuration

```yaml
model:
  create: false  # Set to false to use existing model (default model)
  name: "default"
  type: "azure"  # azure, openai, claude, gemini
  model:
    value: "gpt-4o-mini"
  config:
    azure:
      baseUrl:
        value: "https://your-openai-instance.openai.azure.com/"
      apiKey:
        valueFrom:
          secretKeyRef:
            name: "azure-openai-secret"
            key: "token"
      apiVersion:
        value: "2024-02-15-preview"
```

### MCP Servers

```yaml
# Note: MCP servers are disabled by default as they require custom images
mcp:
  filesys:
    enabled: false  # Disabled - requires custom MCP server image
    name: "demo-filesys-mcp"
    image: "ghcr.io/mckinsey/agents-at-scale-ark/mcp-filesys:latest"
    port: 8080
    
  websearch:
    enabled: false  # Disabled - requires custom MCP server image
    name: "demo-websearch-mcp"
    image: "ghcr.io/mckinsey/agents-at-scale-ark/mcp-websearch:latest"
    port: 8081
```

## Usage After Installation

### List Deployed Resources

```bash
# Check agents in default namespace (dashboard visible)
kubectl get agents,teams,queries -n default

# List all agents
kubectl get agents -n default
```

### Test Demos

```bash
# Check math agent
kubectl get agent math-agent -n default -o yaml

# Execute weather query
kubectl get query weather-query -n default -o yaml

# View research team
kubectl get team research-analysis-team -n default -o yaml
```

### Monitor Deployment

```bash
# Watch agent status
kubectl get agents -n default -w

# Check query execution status
kubectl get queries -n default

# View controller logs
kubectl logs -l app=agent-go-controller-manager -n ark-system
```

## Extensibility

The chart is designed to be easily extended for future demos:

### Adding New Demos

1. Add demo configuration to `values.yaml`:
```yaml
demos:
  new-demo:
    enabled: true
    name: "new-demo"
    description: "Description of new demo"
    complexity: "enterprise"
    category: "integration"
```

2. Create template file `templates/demo-new-demo.yaml`
3. Add demo-specific resources (agents, teams, queries, tools)

### Future Enterprise Demos

The chart includes placeholders for enterprise integrations:

```yaml
extensions:
  enterprise:
    enabled: false
    demos:
      jira:
        enabled: false
        name: "jira-demo"
        description: "Jira integration demo"
        
      figma:
        enabled: false
        name: "figma-demo"
        description: "可是ma integration demo"
        
      n8n:
        enabled: false
        name: "n8n-demo"
        description: "N8N workflow automation demo"
```

## Uninstallation

```bash
# Using ARK CLI (recommended)
ark demos uninstall

# Using ARK CLI with custom namespace
ark demos uninstall -n my-namespace

# Using Helm directly
helm uninstall ark-demos -n default

# Verify removal
kubectl get agents -n default
```

## Troubleshooting

### Common Issues

1. **Model not found**: Ensure the model is properly configured and secrets are available
2. **MCP server connection failed**: Check MCP server deployment and network connectivity
3. **Tool execution failed**: Verify tool configuration and API endpoints

### Debug Commands

```bash
# Check agent status
kubectl describe agent math-agent -n default

# Check team status
kubectl describe team weather-workflow-team -n default

# Check query execution
kubectl logs -l app=agent-go-controller-manager -n ark-system
```

## Contributing

To add new demos or improve existing ones:

1. Update `values.yaml` with new configuration
2. Create or modify template files
3. Update this README with usage instructions
4. Test the chart with different configurations
5. Update ARK CLI demos command to support new demos

## License

Apache 2.0
