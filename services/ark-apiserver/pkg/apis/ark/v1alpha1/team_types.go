package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +k8s:deepcopy-gen=true
type TeamMember struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

// +k8s:deepcopy-gen=true
type TeamSelectorSpec struct {
	Agent          string `json:"agent,omitempty"`
	SelectorPrompt string `json:"selectorPrompt,omitempty"`
}

// +k8s:deepcopy-gen=true
type TeamGraphEdge struct {
	From string `json:"from"`
	To   string `json:"to"`
}

// +k8s:deepcopy-gen=true
type TeamGraphSpec struct {
	Edges []TeamGraphEdge `json:"edges"`
}

// +k8s:deepcopy-gen=true
type TeamSpec struct {
	Members     []TeamMember      `json:"members"`
	Strategy    string            `json:"strategy"`
	Description string            `json:"description,omitempty"`
	MaxTurns    *int              `json:"maxTurns,omitempty"`
	Selector    *TeamSelectorSpec `json:"selector,omitempty"`
	Graph       *TeamGraphSpec    `json:"graph,omitempty"`
}

// +k8s:deepcopy-gen=true
type TeamStatus struct {
	Conditions []metav1.Condition `json:"conditions,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type Team struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   TeamSpec   `json:"spec,omitempty"`
	Status TeamStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type TeamList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Team `json:"items"`
}
