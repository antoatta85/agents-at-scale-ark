package eventing

import (
	"time"
)

type EventData struct {
	QueryID   string `json:"queryId,omitempty"`
	SessionID string `json:"sessionId,omitempty"`

	QueryName      string `json:"queryName,omitempty"`
	QueryNamespace string `json:"queryNamespace,omitempty"`
	AgentName      string `json:"agentName,omitempty"`
	TeamName       string `json:"teamName,omitempty"`
	ModelName      string `json:"modelName,omitempty"`
	TargetName     string `json:"targetName,omitempty"`

	TargetIndex       *int   `json:"targetIndex,omitempty"`
	TurnNumber        *int   `json:"turnNumber,omitempty"`
	TeamMemberIndex   *int   `json:"teamMemberIndex,omitempty"`
	ExecutionStrategy string `json:"executionStrategy,omitempty"`

	A2AServerName     string   `json:"a2aServerName,omitempty"`
	A2ACapabilities   []string `json:"a2aCapabilities,omitempty"`
	A2AAgentName      string   `json:"a2aAgentName,omitempty"`
	A2AConversationID string   `json:"a2aConversationId,omitempty"`

	SelectedParticipant   string   `json:"selectedParticipant,omitempty"`
	AvailableParticipants []string `json:"availableParticipants,omitempty"`
	SelectorResponse      string   `json:"selectorResponse,omitempty"`

	MemoryThreadID string `json:"memoryThreadId,omitempty"`
	MessageCount   *int   `json:"messageCount,omitempty"`

	StartTime  *time.Time `json:"startTime,omitempty"`
	EndTime    *time.Time `json:"endTime,omitempty"`
	DurationMs *int64     `json:"durationMs,omitempty"`

	PromptTokens     *int64 `json:"promptTokens,omitempty"`
	CompletionTokens *int64 `json:"completionTokens,omitempty"`
	TotalTokens      *int64 `json:"totalTokens,omitempty"`

	Result       string `json:"result,omitempty"`
	ErrorMessage string `json:"error,omitempty"`
	ErrorCode    string `json:"errorCode,omitempty"`

	Parameters map[string]string `json:"parameters,omitempty"`
	Metadata   map[string]string `json:"metadata,omitempty"`
}
