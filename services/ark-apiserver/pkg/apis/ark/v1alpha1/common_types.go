package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

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
type TokenUsage struct {
	PromptTokens     int64 `json:"promptTokens,omitempty"`
	CompletionTokens int64 `json:"completionTokens,omitempty"`
	TotalTokens      int64 `json:"totalTokens,omitempty"`
}
