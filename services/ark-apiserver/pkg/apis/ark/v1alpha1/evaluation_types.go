package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// +k8s:deepcopy-gen=true
type EvaluationEvaluatorRef struct {
	Name       string      `json:"name"`
	Namespace  string      `json:"namespace,omitempty"`
	Parameters []Parameter `json:"parameters,omitempty"`
}

// +k8s:deepcopy-gen=true
type EvaluationQueryRef struct {
	Name           string `json:"name"`
	Namespace      string `json:"namespace,omitempty"`
	ResponseTarget string `json:"responseTarget,omitempty"`
}

// +k8s:deepcopy-gen=true
type DirectEvaluationConfig struct {
	Input  string `json:"input,omitempty"`
	Output string `json:"output,omitempty"`
}

// +k8s:deepcopy-gen=true
type QueryBasedEvaluationConfig struct {
	QueryRef *EvaluationQueryRef `json:"queryRef,omitempty"`
}

// +k8s:deepcopy-gen=true
type EvaluationRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
}

// +k8s:deepcopy-gen=true
type BatchEvaluationItem struct {
	Name      string                 `json:"name,omitempty"`
	Type      string                 `json:"type"`
	Config    EvaluationConfig       `json:"config"`
	Evaluator EvaluationEvaluatorRef `json:"evaluator"`
	TTL       *metav1.Duration       `json:"ttl,omitempty"`
	Timeout   *metav1.Duration       `json:"timeout,omitempty"`
}

// +k8s:deepcopy-gen=true
type BatchEvaluationTemplate struct {
	NamePrefix string                 `json:"namePrefix,omitempty"`
	Evaluator  EvaluationEvaluatorRef `json:"evaluator"`
	Type       string                 `json:"type"`
	Config     EvaluationConfig       `json:"config"`
	Parameters []Parameter            `json:"parameters,omitempty"`
}

// +k8s:deepcopy-gen=true
type QuerySelector struct {
	MatchLabels       map[string]string                 `json:"matchLabels,omitempty"`
	MatchExpressions  []metav1.LabelSelectorRequirement `json:"matchExpressions,omitempty"`
}

// +k8s:deepcopy-gen=true
type BatchEvaluationConfig struct {
	Items             []BatchEvaluationItem    `json:"items,omitempty"`
	Template          *BatchEvaluationTemplate `json:"template,omitempty"`
	QuerySelector     *QuerySelector           `json:"querySelector,omitempty"`
	Evaluations       []EvaluationRef          `json:"evaluations,omitempty"`
	Concurrency       int32                    `json:"concurrency,omitempty"`
	ContinueOnFailure bool                     `json:"continueOnFailure,omitempty"`
}

// +k8s:deepcopy-gen=true
type BaselineEvaluationConfig struct{}

// +k8s:deepcopy-gen=true
type ExpressionRule struct {
	Name        string `json:"name"`
	Expression  string `json:"expression"`
	Description string `json:"description,omitempty"`
	Weight      int32  `json:"weight,omitempty"`
}

// +k8s:deepcopy-gen=true
type EventEvaluationConfig struct {
	Rules []ExpressionRule `json:"rules,omitempty"`
}

// +k8s:deepcopy-gen=true
type EvaluationConfig struct {
	*DirectEvaluationConfig     `json:",inline"`
	*QueryBasedEvaluationConfig `json:",inline"`
	*BatchEvaluationConfig      `json:",inline"`
	*BaselineEvaluationConfig   `json:",inline"`
	*EventEvaluationConfig      `json:",inline"`
}

// +k8s:deepcopy-gen=true
type EvaluationSpec struct {
	Type      string                 `json:"type,omitempty"`
	Config    EvaluationConfig       `json:"config"`
	Evaluator EvaluationEvaluatorRef `json:"evaluator,omitempty"`
	TTL       *metav1.Duration       `json:"ttl,omitempty"`
	Timeout   *metav1.Duration       `json:"timeout,omitempty"`
}

// +k8s:deepcopy-gen=true
type ChildEvaluationStatus struct {
	Name    string `json:"name"`
	Phase   string `json:"phase,omitempty"`
	Score   string `json:"score,omitempty"`
	Passed  bool   `json:"passed"`
	Message string `json:"message,omitempty"`
}

// +k8s:deepcopy-gen=true
type BatchEvaluationProgress struct {
	Total            int32                   `json:"total,omitempty"`
	Completed        int32                   `json:"completed,omitempty"`
	Failed           int32                   `json:"failed,omitempty"`
	Running          int32                   `json:"running,omitempty"`
	ChildEvaluations []ChildEvaluationStatus `json:"childEvaluations,omitempty"`
}

// +k8s:deepcopy-gen=true
type EvaluationStatus struct {
	Phase         string                   `json:"phase,omitempty"`
	Message       string                   `json:"message,omitempty"`
	Score         string                   `json:"score,omitempty"`
	Passed        bool                     `json:"passed"`
	TokenUsage    *TokenUsage              `json:"tokenUsage,omitempty"`
	Duration      *metav1.Duration         `json:"duration,omitempty"`
	BatchProgress *BatchEvaluationProgress `json:"batchProgress,omitempty"`
	Conditions    []metav1.Condition       `json:"conditions,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type Evaluation struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   EvaluationSpec   `json:"spec,omitempty"`
	Status EvaluationStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type EvaluationList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Evaluation `json:"items"`
}
