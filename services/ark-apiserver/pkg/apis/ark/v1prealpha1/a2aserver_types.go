package v1prealpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +k8s:deepcopy-gen=true
type A2AServerSpec struct {
	Address      ValueSource      `json:"address"`
	Headers      []Header         `json:"headers,omitempty"`
	Description  string           `json:"description,omitempty"`
	PollInterval *metav1.Duration `json:"pollInterval,omitempty"`
	Timeout      string           `json:"timeout,omitempty"`
}

// +k8s:deepcopy-gen=true
type A2AServerStatus struct {
	LastResolvedAddress string             `json:"lastResolvedAddress,omitempty"`
	Conditions          []metav1.Condition `json:"conditions,omitempty"`
}

// +genclient
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

type A2AServer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   A2AServerSpec   `json:"spec,omitempty"`
	Status A2AServerStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

type A2AServerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []A2AServer `json:"items"`
}
