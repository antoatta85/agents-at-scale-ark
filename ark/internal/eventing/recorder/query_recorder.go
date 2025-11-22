package recorder

import (
	"context"

	"github.com/openai/openai-go"
	corev1 "k8s.io/api/core/v1"
	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
	"mckinsey.com/ark/internal/eventing"
)

type (
	tokenCollectorKeyType struct{}
	queryKeyType          struct{}
)

var (
	tokenCollectorKey = tokenCollectorKeyType{}
	queryKey          = queryKeyType{}
)

type queryRecorder struct {
	emitter eventing.EventEmitter
}

func NewQueryRecorder(emitter eventing.EventEmitter) eventing.QueryRecorder {
	return &queryRecorder{
		emitter: emitter,
	}
}

func (t *queryRecorder) StartTokenCollection(ctx context.Context) context.Context {
	collector := eventing.NewTokenCollector()
	return context.WithValue(ctx, tokenCollectorKey, collector)
}

func (t *queryRecorder) AddTokens(ctx context.Context, promptTokens, completionTokens, totalTokens int64) {
	collector, ok := ctx.Value(tokenCollectorKey).(eventing.TokenCollector)
	if !ok || collector == nil {
		return
	}
	collector.AddTokens(promptTokens, completionTokens, totalTokens)
}

func (t *queryRecorder) AddTokenUsage(ctx context.Context, usage arkv1alpha1.TokenUsage) {
	collector, ok := ctx.Value(tokenCollectorKey).(eventing.TokenCollector)
	if !ok || collector == nil {
		return
	}
	collector.AddTokens(usage.PromptTokens, usage.CompletionTokens, usage.TotalTokens)
}

func (t *queryRecorder) AddCompletionUsage(ctx context.Context, usage openai.CompletionUsage) {
	collector, ok := ctx.Value(tokenCollectorKey).(eventing.TokenCollector)
	if !ok || collector == nil {
		return
	}
	collector.AddTokens(usage.PromptTokens, usage.CompletionTokens, usage.TotalTokens)
}

func (t *queryRecorder) GetTokenSummary(ctx context.Context) arkv1alpha1.TokenUsage {
	collector, ok := ctx.Value(tokenCollectorKey).(eventing.TokenCollector)
	if !ok || collector == nil {
		return arkv1alpha1.TokenUsage{}
	}
	return collector.GetSummary()
}

func (t *queryRecorder) getQueryFromContext(ctx context.Context) *arkv1alpha1.Query {
	if v := ctx.Value(queryKey); v != nil {
		if query, ok := v.(*arkv1alpha1.Query); ok {
			return query
		}
	}
	return nil
}

func (t *queryRecorder) buildEventData(query *arkv1alpha1.Query) eventing.EventData {
	data := eventing.EventData{}

	if query != nil {
		data.QueryID = string(query.UID)
		data.SessionID = query.Spec.SessionId
		data.QueryName = query.Name
		data.QueryNamespace = query.Namespace
	}

	return data
}

func (qt *queryRecorder) eventFromContext(ctx context.Context) (eventing.EventData, *arkv1alpha1.Query) {
	eventData := eventing.EventData{}
	if query := qt.getQueryFromContext(ctx); query != nil {
		eventData = qt.buildEventData(query)
		return eventData, query
	}
	return eventData, nil
}

func (qt *queryRecorder) QueryResolveStart(ctx context.Context, query *arkv1alpha1.Query) context.Context {
	ctx = qt.StartTokenCollection(ctx)
	ctx = context.WithValue(ctx, queryKey, query)

	eventData := qt.buildEventData(query)

	qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "QueryResolveStart", "Query resolution started", eventData)

	return ctx
}

func (qt *queryRecorder) QueryResolveComplete(ctx context.Context) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		tokenUsage := qt.GetTokenSummary(ctx)
		if tokenUsage.TotalTokens > 0 {
			eventData.PromptTokens = &tokenUsage.PromptTokens
			eventData.CompletionTokens = &tokenUsage.CompletionTokens
			eventData.TotalTokens = &tokenUsage.TotalTokens
		}
		if query.Status.Duration != nil {
			durationMs := query.Status.Duration.Milliseconds()
			eventData.DurationMs = &durationMs
		}
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "QueryResolveComplete", "Query resolution completed successfully", eventData)
	}
}

func (qt *queryRecorder) QueryResolveFailed(ctx context.Context, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "QueryResolveFailed", "Query resolution failed", eventData)
	}
}

func (qt *queryRecorder) TargetExecutionStart(ctx context.Context, targetType, targetName string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TargetType = targetType
		eventData.TargetName = targetName
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "TargetExecutionStart", "Starting execution of "+targetType+" target "+targetName, eventData)
	}
}

func (qt *queryRecorder) TargetExecutionComplete(ctx context.Context, targetType, targetName string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TargetType = targetType
		eventData.TargetName = targetName
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "TargetExecutionComplete", "Successfully executed "+targetType+" target "+targetName, eventData)
	}
}

func (qt *queryRecorder) TargetExecutionFailed(ctx context.Context, targetType, targetName string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TargetType = targetType
		eventData.TargetName = targetName
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "TargetExecutionFailed", "Failed to execute "+targetType+" target "+targetName, eventData)
	}
}

func (qt *queryRecorder) LLMCallStart(ctx context.Context, modelName string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.ModelName = modelName
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "LLMCallStart", "Calling LLM model "+modelName, eventData)
	}
}

func (qt *queryRecorder) LLMCallComplete(ctx context.Context, modelName string, usage openai.CompletionUsage) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.ModelName = modelName
		eventData.PromptTokens = &usage.PromptTokens
		eventData.CompletionTokens = &usage.CompletionTokens
		eventData.TotalTokens = &usage.TotalTokens
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "LLMCallComplete", "LLM model "+modelName+" completed successfully", eventData)
	}
}

func (qt *queryRecorder) LLMCallFailed(ctx context.Context, modelName string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.ModelName = modelName
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "LLMCallFailed", "LLM model "+modelName+" call failed", eventData)
	}
}

func (qt *queryRecorder) TeamExecutionStart(ctx context.Context, teamName, strategy string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TeamName = teamName
		eventData.ExecutionStrategy = strategy
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "TeamExecutionStart", "Team "+teamName+" started executing with "+strategy+" strategy", eventData)
	}
}

func (qt *queryRecorder) TeamExecutionComplete(ctx context.Context, teamName, result string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TeamName = teamName
		eventData.Result = result
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "TeamExecutionComplete", "Team "+teamName+" completed execution", eventData)
	}
}

func (qt *queryRecorder) TeamTurnStart(ctx context.Context, teamName string, turnNumber int) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TeamName = teamName
		eventData.TurnNumber = &turnNumber
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "TeamTurnStart", "Team "+teamName+" started a new turn", eventData)
	}
}

func (qt *queryRecorder) TeamTurnComplete(ctx context.Context, teamName string, turnNumber int) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TeamName = teamName
		eventData.TurnNumber = &turnNumber
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "TeamTurnComplete", "Team "+teamName+" completed turn", eventData)
	}
}

func (qt *queryRecorder) TeamMaxTurnsReached(ctx context.Context, teamName string, maxTurns int) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TeamName = teamName
		eventData.TurnNumber = &maxTurns
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "TeamMaxTurnsReached", "Team "+teamName+" reached maximum number of turns", eventData)
	}
}

func (qt *queryRecorder) TeamMemberStart(ctx context.Context, teamName string, memberIndex int, memberName string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TeamName = teamName
		eventData.TeamMemberIndex = &memberIndex
		eventData.AgentName = memberName
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "TeamMemberStart", "Agent "+memberName+" started in team "+teamName, eventData)
	}
}

func (qt *queryRecorder) TeamMemberComplete(ctx context.Context, teamName string, memberIndex int, memberName, result string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TeamName = teamName
		eventData.TeamMemberIndex = &memberIndex
		eventData.AgentName = memberName
		eventData.Result = result
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "TeamMemberComplete", "Agent "+memberName+" completed in team "+teamName, eventData)
	}
}

func (qt *queryRecorder) TeamMemberFailed(ctx context.Context, teamName string, memberIndex int, memberName string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TeamName = teamName
		eventData.TeamMemberIndex = &memberIndex
		eventData.AgentName = memberName
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "TeamMemberFailed", "Agent "+memberName+" failed in team "+teamName, eventData)
	}
}

func (qt *queryRecorder) ParticipantSelected(ctx context.Context, teamName, selectedParticipant string, availableParticipants []string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TeamName = teamName
		eventData.SelectedParticipant = selectedParticipant
		eventData.AvailableParticipants = availableParticipants
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "ParticipantSelected", "Selected "+selectedParticipant+" to participate in team "+teamName, eventData)
	}
}

func (qt *queryRecorder) SelectorAgentResponse(ctx context.Context, teamName, selectorResponse string, availableParticipants []string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.TeamName = teamName
		eventData.SelectorResponse = selectorResponse
		eventData.AvailableParticipants = availableParticipants
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "SelectorAgentResponse", "Selector agent provided response for team "+teamName, eventData)
	}
}

func (qt *queryRecorder) AgentExecutionStart(ctx context.Context, agentName, modelName string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.AgentName = agentName
		eventData.ModelName = modelName
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "AgentExecutionStart", "Agent "+agentName+" started execution", eventData)
	}
}

func (qt *queryRecorder) AgentExecutionComplete(ctx context.Context, agentName, modelName string, durationMs int64) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.AgentName = agentName
		eventData.ModelName = modelName
		eventData.DurationMs = &durationMs
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "AgentExecutionComplete", "Agent "+agentName+" completed execution", eventData)
	}
}

func (qt *queryRecorder) A2ADiscoveryStart(ctx context.Context, serverName string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.A2AServerName = serverName
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "A2ADiscoveryStart", "Starting agent discovery on A2A server "+serverName, eventData)
	}
}

func (qt *queryRecorder) A2ADiscoverySuccess(ctx context.Context, serverName, agentName string, capabilities []string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.A2AServerName = serverName
		eventData.A2AAgentName = agentName
		eventData.A2ACapabilities = capabilities
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "A2ADiscoverySuccess", "Discovered agent "+agentName+" on A2A server "+serverName, eventData)
	}
}

func (qt *queryRecorder) A2ADiscoveryFailed(ctx context.Context, serverName string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.A2AServerName = serverName
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "A2ADiscoveryFailed", "Failed to discover agents on A2A server "+serverName, eventData)
	}
}

func (qt *queryRecorder) A2AClientCreateFailed(ctx context.Context, serverName string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.A2AServerName = serverName
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "A2AClientCreateFailed", "Failed to create client for A2A server "+serverName, eventData)
	}
}

func (qt *queryRecorder) A2AConnectionFailed(ctx context.Context, serverName string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.A2AServerName = serverName
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "A2AConnectionFailed", "Failed to connect to A2A server "+serverName, eventData)
	}
}

func (qt *queryRecorder) A2AHeaderResolutionFailed(ctx context.Context, serverName string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.A2AServerName = serverName
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "A2AHeaderResolutionFailed", "Failed to resolve headers for A2A server "+serverName, eventData)
	}
}

func (qt *queryRecorder) A2ACallStart(ctx context.Context, serverName, agentName, conversationID string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.A2AServerName = serverName
		eventData.A2AAgentName = agentName
		eventData.A2AConversationID = conversationID
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "A2ACallStart", "Calling agent "+agentName+" on A2A server "+serverName, eventData)
	}
}

func (qt *queryRecorder) A2ACallComplete(ctx context.Context, serverName, agentName, conversationID, result string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.A2AServerName = serverName
		eventData.A2AAgentName = agentName
		eventData.A2AConversationID = conversationID
		eventData.Result = result
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "A2ACallComplete", "Agent "+agentName+" on A2A server "+serverName+" completed successfully", eventData)
	}
}

func (qt *queryRecorder) A2ACallFailed(ctx context.Context, serverName, agentName, conversationID string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.A2AServerName = serverName
		eventData.A2AAgentName = agentName
		eventData.A2AConversationID = conversationID
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "A2ACallFailed", "Agent "+agentName+" on A2A server "+serverName+" failed", eventData)
	}
}

func (qt *queryRecorder) A2AExecutionSuccess(ctx context.Context, serverName, result string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.A2AServerName = serverName
		eventData.Result = result
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "A2AExecutionSuccess", "A2A execution on server "+serverName+" succeeded", eventData)
	}
}

func (qt *queryRecorder) A2AExecutionFailed(ctx context.Context, serverName string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.A2AServerName = serverName
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "A2AExecutionFailed", "A2A execution on server "+serverName+" failed", eventData)
	}
}

func (qt *queryRecorder) A2AResponseParseError(ctx context.Context, serverName string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.A2AServerName = serverName
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "A2AResponseParseError", "Failed to parse response from A2A server "+serverName, eventData)
	}
}

func (qt *queryRecorder) ExecutorStart(ctx context.Context, engineName string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		if eventData.Metadata == nil {
			eventData.Metadata = make(map[string]string)
		}
		eventData.Metadata["engineName"] = engineName
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "ExecutorStart", "Execution engine "+engineName+" started processing", eventData)
	}
}

func (qt *queryRecorder) ExecutorComplete(ctx context.Context, engineName, result string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.Result = result
		if eventData.Metadata == nil {
			eventData.Metadata = make(map[string]string)
		}
		eventData.Metadata["engineName"] = engineName
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "ExecutorComplete", "Execution engine "+engineName+" completed successfully", eventData)
	}
}

func (qt *queryRecorder) ExecutorFailed(ctx context.Context, engineName string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.ErrorMessage = err.Error()
		if eventData.Metadata == nil {
			eventData.Metadata = make(map[string]string)
		}
		eventData.Metadata["engineName"] = engineName
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "ExecutorFailed", "Execution engine "+engineName+" failed", eventData)
	}
}

func (qt *queryRecorder) MemoryAddMessagesStart(ctx context.Context, threadID string, messageCount int) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.MemoryThreadID = threadID
		eventData.MessageCount = &messageCount
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "MemoryAddMessagesStart", "Adding messages to memory thread "+threadID, eventData)
	}
}

func (qt *queryRecorder) MemoryAddMessagesComplete(ctx context.Context, threadID string, messageCount int) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.MemoryThreadID = threadID
		eventData.MessageCount = &messageCount
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "MemoryAddMessagesComplete", "Successfully added messages to memory thread "+threadID, eventData)
	}
}

func (qt *queryRecorder) MemoryAddMessagesFailed(ctx context.Context, threadID string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.MemoryThreadID = threadID
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "MemoryAddMessagesFailed", "Failed to add messages to memory thread "+threadID, eventData)
	}
}

func (qt *queryRecorder) MemoryGetMessagesStart(ctx context.Context, threadID string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.MemoryThreadID = threadID
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "MemoryGetMessagesStart", "Retrieving messages from memory thread "+threadID, eventData)
	}
}

func (qt *queryRecorder) MemoryGetMessagesComplete(ctx context.Context, threadID string, messageCount int) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.MemoryThreadID = threadID
		eventData.MessageCount = &messageCount
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, "MemoryGetMessagesComplete", "Retrieved messages from memory thread "+threadID, eventData)
	}
}

func (qt *queryRecorder) MemoryGetMessagesFailed(ctx context.Context, threadID string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.MemoryThreadID = threadID
		eventData.ErrorMessage = err.Error()
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "MemoryGetMessagesFailed", "Failed to retrieve messages from memory thread "+threadID, eventData)
	}
}

func (qt *queryRecorder) QueryParameterResolutionFailed(ctx context.Context, paramName string, err error) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		eventData.ErrorMessage = err.Error()
		if eventData.Parameters == nil {
			eventData.Parameters = make(map[string]string)
		}
		eventData.Parameters["paramName"] = paramName
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "QueryParameterResolutionFailed", "Failed to resolve query parameter "+paramName, eventData)
	}
}

func (qt *queryRecorder) QueryParameterNotFound(ctx context.Context, paramName string) {
	if eventData, query := qt.eventFromContext(ctx); query != nil {
		if eventData.Parameters == nil {
			eventData.Parameters = make(map[string]string)
		}
		eventData.Parameters["paramName"] = paramName
		qt.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, "QueryParameterNotFound", "Query parameter "+paramName+" not found", eventData)
	}
}
