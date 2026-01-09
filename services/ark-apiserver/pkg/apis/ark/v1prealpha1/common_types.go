package v1prealpha1

import (
	arkv1alpha1 "mckinsey.com/ark-apiserver/pkg/apis/ark/v1alpha1"
)

// +k8s:deepcopy-gen=true
type ValueSource struct {
	Value     string           `json:"value,omitempty"`
	ValueFrom *ValueFromSource `json:"valueFrom,omitempty"`
}

// +k8s:deepcopy-gen=true
type ValueFromSource struct {
	SecretKeyRef    *arkv1alpha1.SecretKeySelector    `json:"secretKeyRef,omitempty"`
	ConfigMapKeyRef *arkv1alpha1.ConfigMapKeySelector `json:"configMapKeyRef,omitempty"`
	ServiceRef      *ServiceReference                 `json:"serviceRef,omitempty"`
}

// +k8s:deepcopy-gen=true
type ServiceReference struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
	Port      string `json:"port,omitempty"`
	Path      string `json:"path,omitempty"`
}

// +k8s:deepcopy-gen=true
type Header struct {
	Name  string                  `json:"name"`
	Value arkv1alpha1.HeaderValue `json:"value"`
}
