package config

import (
	ctrl "sigs.k8s.io/controller-runtime"

	"mckinsey.com/ark/internal/eventing"
	k8seventing "mckinsey.com/ark/internal/eventing/kubernetes"
	recorders "mckinsey.com/ark/internal/eventing/recorder"
)

type Provider struct {
	modelRecorder           eventing.ModelRecorder
	a2aRecorder             eventing.A2aRecorder
	agentRecorder           eventing.AgentRecorder
	executionEngineRecorder eventing.ExecutionEngineRecorder
	mcpServerRecorder       eventing.MCPServerRecorder
	queryRecorder           eventing.QueryRecorder
}

func NewProvider(mgr ctrl.Manager) *Provider {
	recorder := mgr.GetEventRecorderFor("ark-controller")
	emitter := k8seventing.NewKubernetesEventEmitter(recorder)

	return &Provider{
		modelRecorder:           recorders.NewModelRecorder(emitter),
		a2aRecorder:             recorders.NewA2aRecorder(emitter),
		agentRecorder:           recorders.NewAgentRecorder(emitter),
		executionEngineRecorder: recorders.NewExecutionEngineRecorder(emitter),
		mcpServerRecorder:       recorders.NewMCPServerRecorder(emitter),
		queryRecorder:           recorders.NewQueryRecorder(emitter),
	}
}

func (p *Provider) ModelRecorder() eventing.ModelRecorder {
	return p.modelRecorder
}

func (p *Provider) A2aRecorder() eventing.A2aRecorder {
	return p.a2aRecorder
}

func (p *Provider) AgentRecorder() eventing.AgentRecorder {
	return p.agentRecorder
}

func (p *Provider) ExecutionEngineRecorder() eventing.ExecutionEngineRecorder {
	return p.executionEngineRecorder
}

func (p *Provider) MCPServerRecorder() eventing.MCPServerRecorder {
	return p.mcpServerRecorder
}

func (p *Provider) QueryRecorder() eventing.QueryRecorder {
	return p.queryRecorder
}
