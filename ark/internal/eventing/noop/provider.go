package noop

import (
	"mckinsey.com/ark/internal/eventing"
	"mckinsey.com/ark/internal/eventing/recorder"
)

type noopProvider struct {
	queryRecorder eventing.QueryRecorder
	modelRecorder eventing.ModelRecorder
}

func NewProvider() eventing.Provider {
	emitter := NewNoopEventEmitter()
	return &noopProvider{
		queryRecorder: NewQueryRecorder(),
		modelRecorder: recorder.NewModelRecorder(emitter),
	}
}

func (p *noopProvider) ModelRecorder() eventing.ModelRecorder {
	return p.modelRecorder
}

func (p *noopProvider) A2aRecorder() eventing.A2aRecorder {
	return nil
}

func (p *noopProvider) AgentRecorder() eventing.AgentRecorder {
	return nil
}

func (p *noopProvider) ExecutionEngineRecorder() eventing.ExecutionEngineRecorder {
	return nil
}

func (p *noopProvider) MCPServerRecorder() eventing.MCPServerRecorder {
	return nil
}

func (p *noopProvider) QueryRecorder() eventing.QueryRecorder {
	return p.queryRecorder
}
