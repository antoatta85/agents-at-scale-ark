package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

// +k8s:deepcopy-gen=true
type MCPServerRef struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace,omitempty"`
}

// +k8s:deepcopy-gen=true
type MCPToolRef struct {
	MCPServerRef MCPServerRef `json:"mcpServerRef"`
	ToolName     string       `json:"toolName"`
}

// +k8s:deepcopy-gen=true
type AgentToolRef struct {
	Name string `json:"name"`
}

// +k8s:deepcopy-gen=true
type TeamToolRef struct {
	Name string `json:"name"`
}

// +k8s:deepcopy-gen=true
type BuiltinToolRef struct {
	Name string `json:"name"`
}

// +k8s:deepcopy-gen=true
type ToolAnnotations struct {
	DestructiveHint bool   `json:"destructiveHint,omitempty"`
	IdempotentHint  bool   `json:"idempotentHint,omitempty"`
	OpenWorldHint   bool   `json:"openWorldHint,omitempty"`
	ReadOnlyHint    bool   `json:"readOnlyHint,omitempty"`
	Title           string `json:"title,omitempty"`
}

// +k8s:deepcopy-gen=true
type HTTPSpec struct {
	URL            string      `json:"url"`
	Method         string      `json:"method,omitempty"`
	Headers        []Header    `json:"headers,omitempty"`
	Timeout        string      `json:"timeout,omitempty"`
	Body           string      `json:"body,omitempty"`
	BodyParameters []Parameter `json:"bodyParameters,omitempty"`
}

// +k8s:deepcopy-gen=true
type ToolSpec struct {
	Type        string                `json:"type"`
	Description string                `json:"description,omitempty"`
	InputSchema *runtime.RawExtension `json:"inputSchema,omitempty"`
	Annotations *ToolAnnotations      `json:"annotations,omitempty"`
	HTTP        *HTTPSpec             `json:"http,omitempty"`
	MCP         *MCPToolRef           `json:"mcp,omitempty"`
	Agent       *AgentToolRef         `json:"agent,omitempty"`
	Team        *TeamToolRef          `json:"team,omitempty"`
	Builtin     *BuiltinToolRef       `json:"builtin,omitempty"`
}

// +k8s:deepcopy-gen=true
type ToolStatus struct {
	State   string `json:"state,omitempty"`
	Message string `json:"message,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type Tool struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   ToolSpec   `json:"spec,omitempty"`
	Status ToolStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object
type ToolList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Tool `json:"items"`
}
