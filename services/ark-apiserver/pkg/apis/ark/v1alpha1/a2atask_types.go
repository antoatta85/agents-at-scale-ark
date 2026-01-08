package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +k8s:deepcopy-gen=true
type AgentRef struct {
	Name      string `json:"name,omitempty"`
	Namespace string `json:"namespace,omitempty"`
}

// +k8s:deepcopy-gen=true
type A2AServerRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
}

// +k8s:deepcopy-gen=true
type A2ATaskPart struct {
	Kind     string            `json:"kind"`
	Text     string            `json:"text,omitempty"`
	Data     string            `json:"data,omitempty"`
	MimeType string            `json:"mimeType,omitempty"`
	URI      string            `json:"uri,omitempty"`
	Metadata map[string]string `json:"metadata,omitempty"`
}

// +k8s:deepcopy-gen=true
type A2ATaskArtifact struct {
	ArtifactID  string            `json:"artifactId"`
	Name        string            `json:"name,omitempty"`
	Description string            `json:"description,omitempty"`
	Parts       []A2ATaskPart     `json:"parts"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// +k8s:deepcopy-gen=true
type A2ATaskMessage struct {
	MessageID string            `json:"messageId,omitempty"`
	Role      string            `json:"role"`
	Parts     []A2ATaskPart     `json:"parts"`
	Metadata  map[string]string `json:"metadata,omitempty"`
}

// +k8s:deepcopy-gen=true
type A2ATaskQueryRef struct {
	Name           string `json:"name"`
	Namespace      string `json:"namespace,omitempty"`
	ResponseTarget string `json:"responseTarget,omitempty"`
}

// +k8s:deepcopy-gen=true
type A2ATaskSpec struct {
	QueryRef     A2ATaskQueryRef   `json:"queryRef"`
	A2AServerRef A2AServerRef      `json:"a2aServerRef"`
	AgentRef     AgentRef          `json:"agentRef"`
	TaskID       string            `json:"taskId"`
	ContextID    string            `json:"contextId,omitempty"`
	Input        string            `json:"input,omitempty"`
	Parameters   map[string]string `json:"parameters,omitempty"`
	Priority     int32             `json:"priority,omitempty"`
	Timeout      *metav1.Duration  `json:"timeout,omitempty"`
	TTL          *metav1.Duration  `json:"ttl,omitempty"`
	PollInterval *metav1.Duration  `json:"pollInterval,omitempty"`
}

// +k8s:deepcopy-gen=true
type A2ATaskStatus struct {
	Phase               string             `json:"phase,omitempty"`
	Conditions          []metav1.Condition `json:"conditions,omitempty"`
	StartTime           *metav1.Time       `json:"startTime,omitempty"`
	CompletionTime      *metav1.Time       `json:"completionTime,omitempty"`
	Error               string             `json:"error,omitempty"`
	ProtocolState       string             `json:"protocolState,omitempty"`
	ContextID           string             `json:"contextId,omitempty"`
	Artifacts           []A2ATaskArtifact  `json:"artifacts,omitempty"`
	History             []A2ATaskMessage   `json:"history,omitempty"`
	ProtocolMetadata    map[string]string  `json:"protocolMetadata,omitempty"`
	LastStatusMessage   *A2ATaskMessage    `json:"lastStatusMessage,omitempty"`
	LastStatusTimestamp string             `json:"lastStatusTimestamp,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type A2ATask struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   A2ATaskSpec   `json:"spec,omitempty"`
	Status A2ATaskStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type A2ATaskList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []A2ATask `json:"items"`
}
