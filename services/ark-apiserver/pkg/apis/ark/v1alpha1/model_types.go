package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +k8s:deepcopy-gen=true
type ModelConfig struct {
	OpenAI  *OpenAIModelConfig  `json:"openai,omitempty"`
	Azure   *AzureModelConfig   `json:"azure,omitempty"`
	Bedrock *BedrockModelConfig `json:"bedrock,omitempty"`
}

// +k8s:deepcopy-gen=true
type AzureModelConfig struct {
	BaseURL    ValueSource            `json:"baseUrl"`
	APIKey     ValueSource            `json:"apiKey"`
	APIVersion *ValueSource           `json:"apiVersion,omitempty"`
	Headers    []Header               `json:"headers,omitempty"`
	Properties map[string]ValueSource `json:"properties,omitempty"`
}

// +k8s:deepcopy-gen=true
type OpenAIModelConfig struct {
	BaseURL    ValueSource            `json:"baseUrl"`
	APIKey     ValueSource            `json:"apiKey"`
	Headers    []Header               `json:"headers,omitempty"`
	Properties map[string]ValueSource `json:"properties,omitempty"`
}

// +k8s:deepcopy-gen=true
type BedrockModelConfig struct {
	Region          *ValueSource           `json:"region,omitempty"`
	BaseURL         *ValueSource           `json:"baseUrl,omitempty"`
	AccessKeyID     *ValueSource           `json:"accessKeyId,omitempty"`
	SecretAccessKey *ValueSource           `json:"secretAccessKey,omitempty"`
	SessionToken    *ValueSource           `json:"sessionToken,omitempty"`
	ModelArn        *ValueSource           `json:"modelArn,omitempty"`
	MaxTokens       *int                   `json:"maxTokens,omitempty"`
	Temperature     *string                `json:"temperature,omitempty"`
	Properties      map[string]ValueSource `json:"properties,omitempty"`
}

// +k8s:deepcopy-gen=true
type ModelSpec struct {
	Model        ValueSource      `json:"model"`
	Type         string           `json:"type,omitempty"`
	Provider     string           `json:"provider"`
	Config       ModelConfig      `json:"config"`
	PollInterval *metav1.Duration `json:"pollInterval,omitempty"`
}

// +k8s:deepcopy-gen=true
type ModelStatus struct {
	ResolvedAddress string             `json:"resolvedAddress,omitempty"`
	Conditions      []metav1.Condition `json:"conditions,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type Model struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ModelSpec   `json:"spec,omitempty"`
	Status ModelStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type ModelList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Model `json:"items"`
}
