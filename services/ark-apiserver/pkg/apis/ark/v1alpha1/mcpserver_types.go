package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +k8s:deepcopy-gen=true
type MCPServerSpec struct {
	Address      ValueSource      `json:"address"`
	Headers      []Header         `json:"headers,omitempty"`
	Timeout      string           `json:"timeout,omitempty"`
	Transport    string           `json:"transport,omitempty"`
	Description  string           `json:"description,omitempty"`
	PollInterval *metav1.Duration `json:"pollInterval,omitempty"`
}

// +k8s:deepcopy-gen=true
type MCPServerStatus struct {
	ResolvedAddress string             `json:"resolvedAddress,omitempty"`
	ToolCount       int                `json:"toolCount,omitempty"`
	Conditions      []metav1.Condition `json:"conditions,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type MCPServer struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   MCPServerSpec   `json:"spec,omitempty"`
	Status MCPServerStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type MCPServerList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []MCPServer `json:"items"`
}
