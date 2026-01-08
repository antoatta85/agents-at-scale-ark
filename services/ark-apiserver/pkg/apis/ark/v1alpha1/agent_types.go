package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// +k8s:deepcopy-gen=true
type ToolFunction struct {
	Name      string           `json:"name"`
	Value     string           `json:"value,omitempty"`
	ValueFrom *ValueFromSource `json:"valueFrom,omitempty"`
}

// +k8s:deepcopy-gen=true
type ToolPartial struct {
	Name       string         `json:"name,omitempty"`
	Parameters []ToolFunction `json:"parameters,omitempty"`
}

// +k8s:deepcopy-gen=true
type AgentTool struct {
	Type        string         `json:"type"`
	Name        string         `json:"name,omitempty"`
	Description string         `json:"description,omitempty"`
	Functions   []ToolFunction `json:"functions,omitempty"`
	Partial     *ToolPartial   `json:"partial,omitempty"`
}

// +k8s:deepcopy-gen=true
type AgentModelRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
}

// +k8s:deepcopy-gen=true
type ExecutionEngineRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
}

// +k8s:deepcopy-gen=true
type AgentSpec struct {
	Prompt          string                `json:"prompt,omitempty"`
	Description     string                `json:"description,omitempty"`
	ModelRef        *AgentModelRef        `json:"modelRef,omitempty"`
	ExecutionEngine *ExecutionEngineRef   `json:"executionEngine,omitempty"`
	Tools           []AgentTool           `json:"tools,omitempty"`
	Parameters      []Parameter           `json:"parameters,omitempty"`
	OutputSchema    *runtime.RawExtension `json:"outputSchema,omitempty"`
	Overrides       []Override            `json:"overrides,omitempty"`
}

// +k8s:deepcopy-gen=true
type AgentStatus struct {
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type Agent struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   AgentSpec   `json:"spec,omitempty"`
	Status AgentStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type AgentList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Agent `json:"items"`
}
