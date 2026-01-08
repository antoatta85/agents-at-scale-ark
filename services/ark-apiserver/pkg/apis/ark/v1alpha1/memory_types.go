package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +k8s:deepcopy-gen=true
type MemorySpec struct {
	Address ValueSource `json:"address"`
	Headers []Header    `json:"headers,omitempty"`
}

// +k8s:deepcopy-gen=true
type MemoryStatus struct {
	LastResolvedAddress *string `json:"lastResolvedAddress,omitempty"`
	Phase               string  `json:"phase,omitempty"`
	Message             string  `json:"message,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type Memory struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MemorySpec   `json:"spec,omitempty"`
	Status MemoryStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type MemoryList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Memory `json:"items"`
}
