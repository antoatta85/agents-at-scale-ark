package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// +k8s:deepcopy-gen=true
type QueryTarget struct {
	Type string `json:"type"`
	Name string `json:"name"`
}

// +k8s:deepcopy-gen=true
type MemoryRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
}

// +k8s:deepcopy-gen=true
type ValueSource struct {
	Value     string           `json:"value,omitempty"`
	ValueFrom *ValueFromSource `json:"valueFrom,omitempty"`
}

// +k8s:deepcopy-gen=true
type ValueFromSource struct {
	SecretKeyRef      *SecretKeySelector    `json:"secretKeyRef,omitempty"`
	ConfigMapKeyRef   *ConfigMapKeySelector `json:"configMapKeyRef,omitempty"`
	QueryParameterRef *QueryParameterRef    `json:"queryParameterRef,omitempty"`
}

// +k8s:deepcopy-gen=true
type SecretKeySelector struct {
	Name string `json:"name"`
	Key  string `json:"key"`
}

// +k8s:deepcopy-gen=true
type ConfigMapKeySelector struct {
	Name string `json:"name"`
	Key  string `json:"key"`
}

// +k8s:deepcopy-gen=true
type QueryParameterRef struct {
	Name string `json:"name"`
}

// +k8s:deepcopy-gen=true
type Parameter struct {
	Name      string           `json:"name"`
	Value     string           `json:"value,omitempty"`
	ValueFrom *ValueFromSource `json:"valueFrom,omitempty"`
}

// +k8s:deepcopy-gen=true
type HeaderValue struct {
	Value     string           `json:"value,omitempty"`
	ValueFrom *HeaderValueFrom `json:"valueFrom,omitempty"`
}

// +k8s:deepcopy-gen=true
type HeaderValueFrom struct {
	SecretKeyRef      *SecretKeySelector    `json:"secretKeyRef,omitempty"`
	ConfigMapKeyRef   *ConfigMapKeySelector `json:"configMapKeyRef,omitempty"`
	QueryParameterRef *QueryParameterRef    `json:"queryParameterRef,omitempty"`
}

// +k8s:deepcopy-gen=true
type Header struct {
	Name  string      `json:"name"`
	Value HeaderValue `json:"value"`
}

// +k8s:deepcopy-gen=true
type Override struct {
	Headers       []Header              `json:"headers"`
	ResourceType  string                `json:"resourceType"`
	LabelSelector *metav1.LabelSelector `json:"labelSelector,omitempty"`
}

// +k8s:deepcopy-gen=true
type QuerySpec struct {
	Type           string                `json:"type,omitempty"`
	Input          runtime.RawExtension  `json:"input"`
	Parameters     []Parameter           `json:"parameters,omitempty"`
	Target         *QueryTarget          `json:"target,omitempty"`
	Selector       *metav1.LabelSelector `json:"selector,omitempty"`
	Memory         *MemoryRef            `json:"memory,omitempty"`
	ServiceAccount string                `json:"serviceAccount,omitempty"`
	SessionId      string                `json:"sessionId,omitempty"`
	ConversationId string                `json:"conversationId,omitempty"`
	TTL            *metav1.Duration      `json:"ttl,omitempty"`
	Timeout        *metav1.Duration      `json:"timeout,omitempty"`
	Cancel         bool                  `json:"cancel,omitempty"`
	Overrides      []Override            `json:"overrides,omitempty"`
}

// +k8s:deepcopy-gen=true
type A2AMetadata struct {
	ContextID string `json:"contextId,omitempty"`
	TaskID    string `json:"taskId,omitempty"`
}

// +k8s:deepcopy-gen=true
type Response struct {
	Target  QueryTarget  `json:"target,omitempty"`
	Content string       `json:"content,omitempty"`
	Raw     string       `json:"raw,omitempty"`
	Phase   string       `json:"phase,omitempty"`
	A2A     *A2AMetadata `json:"a2a,omitempty"`
}

// +k8s:deepcopy-gen=true
type TokenUsage struct {
	PromptTokens     int64 `json:"promptTokens,omitempty"`
	CompletionTokens int64 `json:"completionTokens,omitempty"`
	TotalTokens      int64 `json:"totalTokens,omitempty"`
}

// +k8s:deepcopy-gen=true
type QueryStatus struct {
	Phase          string             `json:"phase,omitempty"`
	Conditions     []metav1.Condition `json:"conditions,omitempty"`
	Response       *Response          `json:"response,omitempty"`
	TokenUsage     TokenUsage         `json:"tokenUsage,omitempty"`
	ConversationId string             `json:"conversationId,omitempty"`
	Duration       *metav1.Duration   `json:"duration,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type Query struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   QuerySpec   `json:"spec,omitempty"`
	Status QueryStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type QueryList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Query `json:"items"`
}
