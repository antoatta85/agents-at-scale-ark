package v1prealpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +k8s:deepcopy-gen=true
type ExecutionEngineSpec struct {
	Type        string      `json:"type"`
	Address     ValueSource `json:"address"`
	Description string      `json:"description,omitempty"`
}

// +k8s:deepcopy-gen=true
type ExecutionEngineStatus struct {
	LastResolvedAddress string `json:"lastResolvedAddress,omitempty"`
	Phase               string `json:"phase,omitempty"`
	Message             string `json:"message,omitempty"`
}

// +genclient
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

type ExecutionEngine struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ExecutionEngineSpec   `json:"spec,omitempty"`
	Status ExecutionEngineStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

type ExecutionEngineList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []ExecutionEngine `json:"items"`
}
