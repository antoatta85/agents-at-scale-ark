package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +k8s:deepcopy-gen=true
type ResourceSelector struct {
	metav1.LabelSelector `json:",inline"`
	ResourceType         string                `json:"resourceType"`
	APIGroup             string                `json:"apiGroup,omitempty"`
	Namespaces           []string              `json:"namespaces,omitempty"`
	NamespaceSelector    *metav1.LabelSelector `json:"namespaceSelector,omitempty"`
}

// +k8s:deepcopy-gen=true
type EvaluatorSpec struct {
	Address     ValueSource       `json:"address"`
	Description string            `json:"description,omitempty"`
	Selector    *ResourceSelector `json:"selector,omitempty"`
	Parameters  []Parameter       `json:"parameters,omitempty"`
}

// +k8s:deepcopy-gen=true
type EvaluatorStatus struct {
	LastResolvedAddress string `json:"lastResolvedAddress,omitempty"`
	Phase               string `json:"phase,omitempty"`
	Message             string `json:"message,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type Evaluator struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   EvaluatorSpec   `json:"spec,omitempty"`
	Status EvaluatorStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type EvaluatorList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Evaluator `json:"items"`
}
