package noop

import (
	"context"

	"github.com/openai/openai-go"
	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
	"mckinsey.com/ark/internal/eventing"
	"mckinsey.com/ark/internal/eventing/recorder/tokens"
)

type noopQueryRecorder struct {
	tokens.TokenCollector
}

func NewQueryRecorder() eventing.QueryRecorder {
	return &noopQueryRecorder{
		TokenCollector: tokens.NewTokenCollector(),
	}
}

func (t *noopQueryRecorder) QueryResolveStart(ctx context.Context, query *arkv1alpha1.Query) context.Context {
	return ctx
}

func (t *noopQueryRecorder) QueryResolveComplete(ctx context.Context) {
}

func (t *noopQueryRecorder) QueryResolveFailed(ctx context.Context, err error) {
}

func (t *noopQueryRecorder) TargetExecutionStart(ctx context.Context, targetType, targetName string) {
}

func (t *noopQueryRecorder) TargetExecutionComplete(ctx context.Context, targetType, targetName string) {
}

func (t *noopQueryRecorder) TargetExecutionFailed(ctx context.Context, targetType, targetName string, err error) {
}

func (t *noopQueryRecorder) LLMCallStart(ctx context.Context, modelName string) {
}

func (t *noopQueryRecorder) LLMCallComplete(ctx context.Context, modelName string, usage openai.CompletionUsage) {
}

func (t *noopQueryRecorder) LLMCallFailed(ctx context.Context, modelName string, err error) {
}

func (t *noopQueryRecorder) TeamExecutionStart(ctx context.Context, teamName, strategy string) {
}

func (t *noopQueryRecorder) TeamExecutionComplete(ctx context.Context, teamName, result string) {
}

func (t *noopQueryRecorder) TeamTurnStart(ctx context.Context, teamName string, turnNumber int) {
}

func (t *noopQueryRecorder) TeamTurnComplete(ctx context.Context, teamName string, turnNumber int) {
}

func (t *noopQueryRecorder) TeamMaxTurnsReached(ctx context.Context, teamName string, maxTurns int) {
}

func (t *noopQueryRecorder) TeamMemberStart(ctx context.Context, teamName string, memberIndex int, memberName string) {
}

func (t *noopQueryRecorder) TeamMemberComplete(ctx context.Context, teamName string, memberIndex int, memberName, result string) {
}

func (t *noopQueryRecorder) TeamMemberFailed(ctx context.Context, teamName string, memberIndex int, memberName string, err error) {
}

func (t *noopQueryRecorder) ParticipantSelected(ctx context.Context, teamName, selectedParticipant string, availableParticipants []string) {
}

func (t *noopQueryRecorder) SelectorAgentResponse(ctx context.Context, teamName, selectorResponse string, availableParticipants []string) {
}

func (t *noopQueryRecorder) AgentExecutionStart(ctx context.Context, agentName, modelName string) {
}

func (t *noopQueryRecorder) AgentExecutionComplete(ctx context.Context, agentName, modelName string, durationMs int64) {
}

func (t *noopQueryRecorder) A2ADiscoveryStart(ctx context.Context, serverName string) {
}

func (t *noopQueryRecorder) A2ADiscoverySuccess(ctx context.Context, serverName, agentName string, capabilities []string) {
}

func (t *noopQueryRecorder) A2ADiscoveryFailed(ctx context.Context, serverName string, err error) {
}

func (t *noopQueryRecorder) A2AClientCreateFailed(ctx context.Context, serverName string, err error) {
}

func (t *noopQueryRecorder) A2AConnectionFailed(ctx context.Context, serverName string, err error) {
}

func (t *noopQueryRecorder) A2AHeaderResolutionFailed(ctx context.Context, serverName string, err error) {
}

func (t *noopQueryRecorder) A2ACallStart(ctx context.Context, serverName, agentName, conversationID string) {
}

func (t *noopQueryRecorder) A2ACallComplete(ctx context.Context, serverName, agentName, conversationID, result string) {
}

func (t *noopQueryRecorder) A2ACallFailed(ctx context.Context, serverName, agentName, conversationID string, err error) {
}

func (t *noopQueryRecorder) A2AExecutionSuccess(ctx context.Context, serverName, result string) {
}

func (t *noopQueryRecorder) A2AExecutionFailed(ctx context.Context, serverName string, err error) {
}

func (t *noopQueryRecorder) A2AResponseParseError(ctx context.Context, serverName string, err error) {
}

func (t *noopQueryRecorder) ExecutorStart(ctx context.Context, engineName string) {
}

func (t *noopQueryRecorder) ExecutorComplete(ctx context.Context, engineName, result string) {
}

func (t *noopQueryRecorder) ExecutorFailed(ctx context.Context, engineName string, err error) {
}

func (t *noopQueryRecorder) MemoryAddMessagesStart(ctx context.Context, threadID string, messageCount int) {
}

func (t *noopQueryRecorder) MemoryAddMessagesComplete(ctx context.Context, threadID string, messageCount int) {
}

func (t *noopQueryRecorder) MemoryAddMessagesFailed(ctx context.Context, threadID string, err error) {
}

func (t *noopQueryRecorder) MemoryGetMessagesStart(ctx context.Context, threadID string) {
}

func (t *noopQueryRecorder) MemoryGetMessagesComplete(ctx context.Context, threadID string, messageCount int) {
}

func (t *noopQueryRecorder) MemoryGetMessagesFailed(ctx context.Context, threadID string, err error) {
}

func (t *noopQueryRecorder) QueryParameterResolutionFailed(ctx context.Context, paramName string, err error) {
}

func (t *noopQueryRecorder) QueryParameterNotFound(ctx context.Context, paramName string) {
}
