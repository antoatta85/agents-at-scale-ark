package noop

import (
	"mckinsey.com/ark/internal/eventing"
	"mckinsey.com/ark/internal/eventing/recorder"
)

type noopProvider struct {
	queryRecorder eventing.QueryRecorder
	modelRecorder eventing.ModelRecorder
	teamRecorder  eventing.TeamRecorder
	toolRecorder  eventing.ToolRecorder
}

func NewProvider() eventing.Provider {
	emitter := NewNoopEventEmitter()
	return &noopProvider{
		queryRecorder: NewQueryRecorder(),
		modelRecorder: recorder.NewModelRecorder(emitter),
		teamRecorder:  recorder.NewTeamRecorder(emitter),
		toolRecorder:  recorder.NewToolRecorder(emitter),
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

func (p *noopProvider) TeamRecorder() eventing.TeamRecorder {
	return p.teamRecorder
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

func (p *noopProvider) ToolRecorder() eventing.ToolRecorder {
	return p.toolRecorder
}

func NewModelRecorder() eventing.ModelRecorder {
	emitter := NewNoopEventEmitter()
	return recorder.NewModelRecorder(emitter)
}
