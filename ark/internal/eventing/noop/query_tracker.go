package noop

import (
	"context"

	"github.com/openai/openai-go"
	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
	"mckinsey.com/ark/internal/eventing"
)

type noopQueryTracker struct{}

func NewQueryTracker() eventing.QueryTracker {
	return &noopQueryTracker{}
}

func (t *noopQueryTracker) StartTokenCollection(ctx context.Context) context.Context {
	return ctx
}

func (t *noopQueryTracker) AddTokens(ctx context.Context, promptTokens, completionTokens, totalTokens int64) {
}

func (t *noopQueryTracker) AddTokenUsage(ctx context.Context, usage arkv1alpha1.TokenUsage) {
}

func (t *noopQueryTracker) AddCompletionUsage(ctx context.Context, usage openai.CompletionUsage) {
}

func (t *noopQueryTracker) GetTokenSummary(ctx context.Context) arkv1alpha1.TokenUsage {
	return arkv1alpha1.TokenUsage{}
}

func (t *noopQueryTracker) QueryResolveStart(ctx context.Context, query *arkv1alpha1.Query) context.Context {
	return ctx
}

func (t *noopQueryTracker) QueryResolveComplete(ctx context.Context, result string) {
}

func (t *noopQueryTracker) QueryResolveFailed(ctx context.Context, err error) {
}

func (t *noopQueryTracker) TargetExecutionStart(ctx context.Context, targetIndex int, targetName string) {
}

func (t *noopQueryTracker) TargetExecutionComplete(ctx context.Context, targetIndex int, targetName, result string) {
}

func (t *noopQueryTracker) TargetExecutionFailed(ctx context.Context, targetIndex int, targetName string, err error) {
}

func (t *noopQueryTracker) LLMCallStart(ctx context.Context, modelName string) {
}

func (t *noopQueryTracker) LLMCallComplete(ctx context.Context, modelName string, usage openai.CompletionUsage) {
}

func (t *noopQueryTracker) LLMCallFailed(ctx context.Context, modelName string, err error) {
}

func (t *noopQueryTracker) TeamExecutionStart(ctx context.Context, teamName, strategy string) {
}

func (t *noopQueryTracker) TeamExecutionComplete(ctx context.Context, teamName, result string) {
}

func (t *noopQueryTracker) TeamTurnStart(ctx context.Context, teamName string, turnNumber int) {
}

func (t *noopQueryTracker) TeamTurnComplete(ctx context.Context, teamName string, turnNumber int) {
}

func (t *noopQueryTracker) TeamMaxTurnsReached(ctx context.Context, teamName string, maxTurns int) {
}

func (t *noopQueryTracker) TeamMemberStart(ctx context.Context, teamName string, memberIndex int, memberName string) {
}

func (t *noopQueryTracker) TeamMemberComplete(ctx context.Context, teamName string, memberIndex int, memberName, result string) {
}

func (t *noopQueryTracker) TeamMemberFailed(ctx context.Context, teamName string, memberIndex int, memberName string, err error) {
}

func (t *noopQueryTracker) ParticipantSelected(ctx context.Context, teamName, selectedParticipant string, availableParticipants []string) {
}

func (t *noopQueryTracker) SelectorAgentResponse(ctx context.Context, teamName, selectorResponse string, availableParticipants []string) {
}

func (t *noopQueryTracker) AgentExecutionStart(ctx context.Context, agentName string) {
}

func (t *noopQueryTracker) AgentExecutionComplete(ctx context.Context, agentName, result string) {
}

func (t *noopQueryTracker) A2ADiscoveryStart(ctx context.Context, serverName string) {
}

func (t *noopQueryTracker) A2ADiscoverySuccess(ctx context.Context, serverName, agentName string, capabilities []string) {
}

func (t *noopQueryTracker) A2ADiscoveryFailed(ctx context.Context, serverName string, err error) {
}

func (t *noopQueryTracker) A2AClientCreateFailed(ctx context.Context, serverName string, err error) {
}

func (t *noopQueryTracker) A2AConnectionFailed(ctx context.Context, serverName string, err error) {
}

func (t *noopQueryTracker) A2AHeaderResolutionFailed(ctx context.Context, serverName string, err error) {
}

func (t *noopQueryTracker) A2ACallStart(ctx context.Context, serverName, agentName, conversationID string) {
}

func (t *noopQueryTracker) A2ACallComplete(ctx context.Context, serverName, agentName, conversationID, result string) {
}

func (t *noopQueryTracker) A2ACallFailed(ctx context.Context, serverName, agentName, conversationID string, err error) {
}

func (t *noopQueryTracker) A2AExecutionSuccess(ctx context.Context, serverName, result string) {
}

func (t *noopQueryTracker) A2AExecutionFailed(ctx context.Context, serverName string, err error) {
}

func (t *noopQueryTracker) A2AResponseParseError(ctx context.Context, serverName string, err error) {
}

func (t *noopQueryTracker) ExecutorStart(ctx context.Context, engineName string) {
}

func (t *noopQueryTracker) ExecutorComplete(ctx context.Context, engineName, result string) {
}

func (t *noopQueryTracker) ExecutorFailed(ctx context.Context, engineName string, err error) {
}

func (t *noopQueryTracker) MemoryAddMessagesStart(ctx context.Context, threadID string, messageCount int) {
}

func (t *noopQueryTracker) MemoryAddMessagesComplete(ctx context.Context, threadID string, messageCount int) {
}

func (t *noopQueryTracker) MemoryAddMessagesFailed(ctx context.Context, threadID string, err error) {
}

func (t *noopQueryTracker) MemoryGetMessagesStart(ctx context.Context, threadID string) {
}

func (t *noopQueryTracker) MemoryGetMessagesComplete(ctx context.Context, threadID string, messageCount int) {
}

func (t *noopQueryTracker) MemoryGetMessagesFailed(ctx context.Context, threadID string, err error) {
}

func (t *noopQueryTracker) QueryParameterResolutionFailed(ctx context.Context, paramName string, err error) {
}

func (t *noopQueryTracker) QueryParameterNotFound(ctx context.Context, paramName string) {
}
