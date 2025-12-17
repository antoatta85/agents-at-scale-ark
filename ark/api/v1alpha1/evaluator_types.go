/* Copyright 2025. McKinsey & Company */

package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// EDIT THIS FILE!  THIS IS SCAFFOLDING FOR YOU TO OWN!
// NOTE: json tags are required.  Any new fields you add must have json tags for the fields to be serialized.

// EvaluatorSpec defines the configuration for an evaluator that can assess query performance.
// This allows query evaluations to be executed by different evaluation frameworks and systems,
// rather than the built-in evaluation engine.
// Evaluators work as services that process evaluation requests for queries and provide
// performance assessments and scoring.
type EvaluatorSpec struct {
	// Address specifies how to reach the evaluator service
	// +kubebuilder:validation:Required
	Address ValueSource `json:"address"`

	// Description provides human-readable information about this evaluator
	Description string `json:"description,omitempty"`

	// Selector configuration for automatic query evaluation
	// +kubebuilder:validation:Optional
	Selector *ResourceSelector `json:"selector,omitempty"`

	// Parameters to pass to evaluation requests
	// +kubebuilder:validation:Optional
	Parameters []Parameter `json:"parameters,omitempty"`

	// QueryAgeFilter controls which queries to evaluate based on creation time
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum=all;afterEvaluator;afterTimestamp
	// +kubebuilder:default=all
	QueryAgeFilter string `json:"queryAgeFilter,omitempty"`

	// CreatedAfter specifies the timestamp for queryAgeFilter=afterTimestamp
	// Only queries created after this time will be evaluated
	// +kubebuilder:validation:Optional
	CreatedAfter *metav1.Time `json:"createdAfter,omitempty"`

	// EvaluationMode controls whether to create individual evaluations per query
	// or aggregate queries into batch evaluations
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Enum=individual;batch
	// +kubebuilder:default=individual
	EvaluationMode string `json:"evaluationMode,omitempty"`

	// BatchConfig contains configuration for batch evaluation mode
	// Required when evaluationMode=batch
	// +kubebuilder:validation:Optional
	BatchConfig *EvaluatorBatchConfig `json:"batchConfig,omitempty"`
}

type EvaluatorStatus struct {
	// +kubebuilder:validation:Optional
	// LastResolvedAddress contains the actual resolved address value
	LastResolvedAddress string `json:"lastResolvedAddress,omitempty"`
	Phase               string `json:"phase,omitempty"`
	Message             string `json:"message,omitempty"`
}

// EvaluatorBatchConfig configures batch evaluation creation from evaluator selector
type EvaluatorBatchConfig struct {
	// Name for the batch evaluation (defaults to {evaluator-name}-batch)
	// Ignored when GroupByLabel or GroupByAnnotation is set
	// +kubebuilder:validation:Optional
	Name string `json:"name,omitempty"`

	// UpdateMode controls batch update behavior
	// immutable: Create batch once with queries at that moment, never update
	// dynamic: Continuously append new matching queries to batch
	// +kubebuilder:validation:Required
	// +kubebuilder:validation:Enum=immutable;dynamic
	UpdateMode string `json:"updateMode"`

	// GroupByLabel groups queries by a label key's value
	// Creates separate batch evaluations for each unique label value
	// Batch name format: {evaluator-name}-batch-{sanitized-label-value}
	// +kubebuilder:validation:Optional
	GroupByLabel string `json:"groupByLabel,omitempty"`

	// GroupByAnnotation groups queries by an annotation key's value
	// Creates separate batch evaluations for each unique annotation value
	// Batch name format: {evaluator-name}-batch-{sanitized-annotation-value}
	// +kubebuilder:validation:Optional
	GroupByAnnotation string `json:"groupByAnnotation,omitempty"`

	// Concurrency controls max concurrent child evaluations in batch
	// +kubebuilder:validation:Optional
	// +kubebuilder:validation:Minimum=1
	// +kubebuilder:validation:Maximum=100
	// +kubebuilder:default=10
	Concurrency int `json:"concurrency,omitempty"`

	// ContinueOnFailure controls whether to continue if a child evaluation fails
	// +kubebuilder:validation:Optional
	// +kubebuilder:default=true
	ContinueOnFailure bool `json:"continueOnFailure,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Phase",type=string,JSONPath=`.status.phase`
// +kubebuilder:printcolumn:name="Address",type=string,JSONPath=`.status.lastResolvedAddress`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`

type Evaluator struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   EvaluatorSpec   `json:"spec,omitempty"`
	Status EvaluatorStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true

// EvaluatorList contains a list of Evaluator.
type EvaluatorList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Evaluator `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Evaluator{}, &EvaluatorList{})
}
