package genai

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/openai/openai-go"
)

func TestUnmarshalMessageRobust(t *testing.T) {
	testCases := []struct {
		name        string
		jsonInput   string
		expectError bool
		description string
	}{
		{
			name:        "valid discriminated union user message",
			jsonInput:   `{"role": "user", "content": "hello"}`,
			expectError: false,
			description: "Should work with primary discriminated union path",
		},
		{
			name:        "valid discriminated union assistant message",
			jsonInput:   `{"role": "assistant", "content": "Hi there!"}`,
			expectError: false,
			description: "Should work with primary discriminated union path",
		},
		{
			name:        "valid discriminated union system message",
			jsonInput:   `{"role": "system", "content": "You are helpful"}`,
			expectError: false,
			description: "Should work with primary discriminated union path",
		},
		{
			name:        "simple user message (fallback)",
			jsonInput:   `{"role": "user", "content": "simple format"}`,
			expectError: false,
			description: "Should work via fallback path if discriminated union fails",
		},
		{
			name:        "message with missing content",
			jsonInput:   `{"role": "user"}`,
			expectError: false,
			description: "Content is optional, should work",
		},
		{
			name:        "message with empty content",
			jsonInput:   `{"role": "assistant", "content": ""}`,
			expectError: false,
			description: "Empty content should work",
		},
		{
			name:        "future role - developer",
			jsonInput:   `{"role": "developer", "content": "Fix this bug"}`,
			expectError: false,
			description: "Unknown roles should fallback to user message (future-proof)",
		},
		{
			name:        "future role - function",
			jsonInput:   `{"role": "function", "content": "result data"}`,
			expectError: false,
			description: "Unknown roles should fallback to user message (future-proof)",
		},
		{
			name:        "future role - tool",
			jsonInput:   `{"role": "tool", "content": "tool output"}`,
			expectError: false,
			description: "Unknown roles should fallback to user message (future-proof)",
		},
		{
			name:        "message with extra fields",
			jsonInput:   `{"role": "user", "content": "hello", "extra": "ignored", "timestamp": 123}`,
			expectError: false,
			description: "Extra fields should be ignored",
		},
		{
			name:        "invalid - missing role",
			jsonInput:   `{"content": "hello"}`,
			expectError: true,
			description: "Missing role should fail",
		},
		{
			name:        "invalid - empty role",
			jsonInput:   `{"role": "", "content": "hello"}`,
			expectError: true,
			description: "Empty role should fail",
		},
		{
			name:        "invalid - malformed JSON",
			jsonInput:   `{malformed json}`,
			expectError: true,
			description: "Malformed JSON should fail",
		},
		{
			name:        "invalid - empty object",
			jsonInput:   `{}`,
			expectError: true,
			description: "Empty object should fail",
		},
		{
			name:        "invalid - null",
			jsonInput:   `null`,
			expectError: true,
			description: "Null should fail",
		},
		{
			name:        "invalid - empty string",
			jsonInput:   `""`,
			expectError: true,
			description: "Empty string should fail",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			rawJSON := json.RawMessage(tc.jsonInput)
			result, err := unmarshalMessageRobust(rawJSON)

			switch {
			case tc.expectError && err == nil:
				t.Errorf("Expected error for %s, but got none. Description: %s", tc.name, tc.description)
			case !tc.expectError && err != nil:
				t.Errorf("Unexpected error for %s: %v. Description: %s", tc.name, err, tc.description)
			case !tc.expectError && result == (openai.ChatCompletionMessageParamUnion{}):
				t.Errorf("Got empty message for %s. Description: %s", tc.name, tc.description)
			}
		})
	}
}

func TestUnmarshalMessageRobustFutureRoles(t *testing.T) {
	futureRoles := []string{"developer", "function", "tool", "moderator", "agent"}

	for _, role := range futureRoles {
		t.Run(role, func(t *testing.T) {
			jsonInput := `{"role": "` + role + `", "content": "test"}`
			result, err := unmarshalMessageRobust(json.RawMessage(jsonInput))
			if err != nil {
				t.Errorf("Future role '%s' should not fail: %v", role, err)
			}
			if result == (openai.ChatCompletionMessageParamUnion{}) {
				t.Errorf("Future role '%s' should produce valid message", role)
			}
		})
	}
}

func TestGetEffectiveTimeout(t *testing.T) {
	// Create a mock HTTPMemory instance
	m := &HTTPMemory{
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}

	tests := []struct {
		name           string
		ctx            context.Context
		defaultTimeout time.Duration
		expectedMin    time.Duration
		expectedMax    time.Duration
		description    string
	}{
		{
			name:           "context with 5 minute deadline - should use ~90%",
			ctx:            func() context.Context { ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute); defer cancel(); return ctx }(),
			defaultTimeout: 60 * time.Second,
			expectedMin:    4*time.Minute + 20*time.Second, // 90% of 5 min = 4.5 min, allow some tolerance
			expectedMax:    5 * time.Minute,
			description:    "Should use ~90% of context deadline when longer than default",
		},
		{
			name:           "context with 30 second deadline - should use default",
			ctx:            func() context.Context { ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second); defer cancel(); return ctx }(),
			defaultTimeout: 60 * time.Second,
			expectedMin:    60 * time.Second,
			expectedMax:    60 * time.Second,
			description:    "Should use default when context deadline is shorter",
		},
		{
			name:           "context with 10 minute deadline - should cap at 5 min",
			ctx:            func() context.Context { ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute); defer cancel(); return ctx }(),
			defaultTimeout: 60 * time.Second,
			expectedMin:    4*time.Minute + 50*time.Second, // 90% of 10 min = 9 min, but capped at 5 min
			expectedMax:    5 * time.Minute,
			description:    "Should cap at 5 minutes maximum",
		},
		{
			name:           "context without deadline - should use default",
			ctx:            context.Background(),
			defaultTimeout: 60 * time.Second,
			expectedMin:    60 * time.Second,
			expectedMax:    60 * time.Second,
			description:    "Should use default when no deadline",
		},
		{
			name:           "context with very short deadline - should enforce minimum",
			ctx:            func() context.Context { ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second); defer cancel(); return ctx }(),
			defaultTimeout: 60 * time.Second,
			expectedMin:    5 * time.Second,
			expectedMax:    60 * time.Second, // Should use default (longer)
			description:    "Should enforce minimum 5 seconds but use default if longer",
		},
		{
			name:           "context with 2 minute deadline - should use context-based",
			ctx:            func() context.Context { ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute); defer cancel(); return ctx }(),
			defaultTimeout: 60 * time.Second,
			expectedMin:    100 * time.Second, // 90% of 2 min = 108 sec, allow tolerance
			expectedMax:    2 * time.Minute,
			description:    "Should use context-based timeout when longer than default",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := m.getEffectiveTimeout(tt.ctx, tt.defaultTimeout)
			if result < tt.expectedMin || result > tt.expectedMax {
				t.Errorf("Expected timeout between %v and %v, got %v. %s",
					tt.expectedMin, tt.expectedMax, result, tt.description)
			}
		})
	}
}
