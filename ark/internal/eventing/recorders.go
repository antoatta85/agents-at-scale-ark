package eventing

import (
	"context"

	"github.com/openai/openai-go"
	"k8s.io/apimachinery/pkg/runtime"
	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
)

type ModelTracker interface {
	ModelUnavailable(ctx context.Context, model runtime.Object, reason string)
}

type A2aTracker interface {
	AgentCreationFailed(ctx context.Context, obj runtime.Object, reason string)
	AgentDeletionFailed(ctx context.Context, obj runtime.Object, reason string)
	TaskPollingFailed(ctx context.Context, obj runtime.Object, reason string)
}

type AgentTracker interface {
	DependencyUnavailable(ctx context.Context, obj runtime.Object, reason string)
}

type ExecutionEngineTracker interface {
	AddressResolutionFailed(ctx context.Context, obj runtime.Object, reason string)
}

type MCPServerTracker interface {
	AddressResolutionFailed(ctx context.Context, obj runtime.Object, reason string)
	ClientCreationFailed(ctx context.Context, obj runtime.Object, reason string)
	ToolListingFailed(ctx context.Context, obj runtime.Object, reason string)
	ToolCreationFailed(ctx context.Context, obj runtime.Object, reason string)
}

type QueryTracker interface {
	StartTokenCollection(ctx context.Context) context.Context
	AddTokens(ctx context.Context, promptTokens, completionTokens, totalTokens int64)
	AddTokenUsage(ctx context.Context, usage arkv1alpha1.TokenUsage)
	AddCompletionUsage(ctx context.Context, usage openai.CompletionUsage)
	GetTokenSummary(ctx context.Context) arkv1alpha1.TokenUsage

	QueryResolveStart(ctx context.Context, query *arkv1alpha1.Query) context.Context
	QueryResolveComplete(ctx context.Context)
	QueryResolveFailed(ctx context.Context, err error)

	TargetExecutionStart(ctx context.Context, targetType, targetName string)
	TargetExecutionComplete(ctx context.Context, targetType, targetName string)
	TargetExecutionFailed(ctx context.Context, targetType, targetName string, err error)

	LLMCallStart(ctx context.Context, modelName string)
	LLMCallComplete(ctx context.Context, modelName string, usage openai.CompletionUsage)
	LLMCallFailed(ctx context.Context, modelName string, err error)

	TeamExecutionStart(ctx context.Context, teamName, strategy string)
	TeamExecutionComplete(ctx context.Context, teamName, result string)
	TeamTurnStart(ctx context.Context, teamName string, turnNumber int)
	TeamTurnComplete(ctx context.Context, teamName string, turnNumber int)
	TeamMaxTurnsReached(ctx context.Context, teamName string, maxTurns int)
	TeamMemberStart(ctx context.Context, teamName string, memberIndex int, memberName string)
	TeamMemberComplete(ctx context.Context, teamName string, memberIndex int, memberName, result string)
	TeamMemberFailed(ctx context.Context, teamName string, memberIndex int, memberName string, err error)

	ParticipantSelected(ctx context.Context, teamName, selectedParticipant string, availableParticipants []string)
	SelectorAgentResponse(ctx context.Context, teamName, selectorResponse string, availableParticipants []string)

	AgentExecutionStart(ctx context.Context, agentName, modelName string)
	AgentExecutionComplete(ctx context.Context, agentName, modelName string, durationMs int64)

	A2ADiscoveryStart(ctx context.Context, serverName string)
	A2ADiscoverySuccess(ctx context.Context, serverName, agentName string, capabilities []string)
	A2ADiscoveryFailed(ctx context.Context, serverName string, err error)
	A2AClientCreateFailed(ctx context.Context, serverName string, err error)
	A2AConnectionFailed(ctx context.Context, serverName string, err error)
	A2AHeaderResolutionFailed(ctx context.Context, serverName string, err error)
	A2ACallStart(ctx context.Context, serverName, agentName, conversationID string)
	A2ACallComplete(ctx context.Context, serverName, agentName, conversationID, result string)
	A2ACallFailed(ctx context.Context, serverName, agentName, conversationID string, err error)
	A2AExecutionSuccess(ctx context.Context, serverName, result string)
	A2AExecutionFailed(ctx context.Context, serverName string, err error)
	A2AResponseParseError(ctx context.Context, serverName string, err error)

	ExecutorStart(ctx context.Context, engineName string)
	ExecutorComplete(ctx context.Context, engineName, result string)
	ExecutorFailed(ctx context.Context, engineName string, err error)

	MemoryAddMessagesStart(ctx context.Context, threadID string, messageCount int)
	MemoryAddMessagesComplete(ctx context.Context, threadID string, messageCount int)
	MemoryAddMessagesFailed(ctx context.Context, threadID string, err error)
	MemoryGetMessagesStart(ctx context.Context, threadID string)
	MemoryGetMessagesComplete(ctx context.Context, threadID string, messageCount int)
	MemoryGetMessagesFailed(ctx context.Context, threadID string, err error)

	QueryParameterResolutionFailed(ctx context.Context, paramName string, err error)
	QueryParameterNotFound(ctx context.Context, paramName string)
}

type Provider interface {
	ModelTracker() ModelTracker
	A2aTracker() A2aTracker
	AgentTracker() AgentTracker
	ExecutionEngineTracker() ExecutionEngineTracker
	MCPServerTracker() MCPServerTracker
	QueryTracker() QueryTracker
}
