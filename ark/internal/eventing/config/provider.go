package config

import (
	ctrl "sigs.k8s.io/controller-runtime"

	"mckinsey.com/ark/internal/eventing"
	k8seventing "mckinsey.com/ark/internal/eventing/kubernetes"
	trackers "mckinsey.com/ark/internal/eventing/tracker"
)

type Provider struct {
	modelTracker           eventing.ModelTracker
	a2aTracker             eventing.A2aTracker
	agentTracker           eventing.AgentTracker
	executionEngineTracker eventing.ExecutionEngineTracker
	mcpServerTracker       eventing.MCPServerTracker
	queryTracker           eventing.QueryTracker
}

func NewProvider(mgr ctrl.Manager) *Provider {
	recorder := mgr.GetEventRecorderFor("ark-controller")
	emitter := k8seventing.NewKubernetesEventEmitter(recorder)

	return &Provider{
		modelTracker:           trackers.NewModelTracker(emitter),
		a2aTracker:             trackers.NewA2aTracker(emitter),
		agentTracker:           trackers.NewAgentTracker(emitter),
		executionEngineTracker: trackers.NewExecutionEngineTracker(emitter),
		mcpServerTracker:       trackers.NewMCPServerTracker(emitter),
		queryTracker:           trackers.NewQueryTracker(emitter),
	}
}

func (p *Provider) ModelTracker() eventing.ModelTracker {
	return p.modelTracker
}

func (p *Provider) A2aTracker() eventing.A2aTracker {
	return p.a2aTracker
}

func (p *Provider) AgentTracker() eventing.AgentTracker {
	return p.agentTracker
}

func (p *Provider) ExecutionEngineTracker() eventing.ExecutionEngineTracker {
	return p.executionEngineTracker
}

func (p *Provider) MCPServerTracker() eventing.MCPServerTracker {
	return p.mcpServerTracker
}

func (p *Provider) QueryTracker() eventing.QueryTracker {
	return p.queryTracker
}
