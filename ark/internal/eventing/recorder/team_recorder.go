package recorder

import (
	"context"
	"fmt"

	"mckinsey.com/ark/internal/eventing"
	"mckinsey.com/ark/internal/eventing/recorder/operations"
	"mckinsey.com/ark/internal/eventing/recorder/tokens"
)

type teamRecorder struct {
	tokens.TokenCollector
	operations.OperationTracker
	emitter eventing.EventEmitter
}

func NewTeamRecorder(emitter eventing.EventEmitter) eventing.TeamRecorder {
	return &teamRecorder{
		TokenCollector:   tokens.NewTokenCollector(),
		OperationTracker: operations.NewOperationTracker(emitter),
		emitter:          emitter,
	}
}

func (tr *teamRecorder) Start(ctx context.Context, operation, message string, data map[string]string) context.Context {
	ctx = tr.StartTokenCollection(ctx)
	return tr.OperationTracker.Start(ctx, operation, message, data)
}

func (tr *teamRecorder) Complete(ctx context.Context, operation, message string, data map[string]string) {
	tokenUsage := tr.GetTokenSummary(ctx)
	if data == nil {
		data = make(map[string]string)
	}
	data["promptTokens"] = fmt.Sprintf("%d", tokenUsage.PromptTokens)
	data["completionTokens"] = fmt.Sprintf("%d", tokenUsage.CompletionTokens)
	data["totalTokens"] = fmt.Sprintf("%d", tokenUsage.TotalTokens)
	tr.OperationTracker.Complete(ctx, operation, message, data)
}

func (tr *teamRecorder) Fail(ctx context.Context, operation, message string, err error, data map[string]string) {
	tokenUsage := tr.GetTokenSummary(ctx)
	if data == nil {
		data = make(map[string]string)
	}
	data["promptTokens"] = fmt.Sprintf("%d", tokenUsage.PromptTokens)
	data["completionTokens"] = fmt.Sprintf("%d", tokenUsage.CompletionTokens)
	data["totalTokens"] = fmt.Sprintf("%d", tokenUsage.TotalTokens)
	tr.OperationTracker.Fail(ctx, operation, message, err, data)
}

func (tr *teamRecorder) ParticipantSelected(ctx context.Context, participantName string) {
	if qd := tr.GetQueryDetails(ctx); qd != nil && qd.Query != nil {
		tr.emitter.EmitNormal(ctx, qd.Query, "ParticipantSelected", fmt.Sprintf("Selected participant: %s", participantName))
	}
}

func (tr *teamRecorder) SelectorAgentResponse(ctx context.Context, agentName, response string) {
	if qd := tr.GetQueryDetails(ctx); qd != nil && qd.Query != nil {
		tr.emitter.EmitNormal(ctx, qd.Query, "SelectorAgentResponse", fmt.Sprintf("Selector agent %s responded: %s", agentName, response))
	}
}
