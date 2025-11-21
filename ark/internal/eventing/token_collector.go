package eventing

import (
	"sync"

	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
)

type TokenCollector interface {
	AddTokens(promptTokens, completionTokens, totalTokens int64)
	GetSummary() arkv1alpha1.TokenUsage
	Reset()
}

type DefaultTokenCollector struct {
	mu               sync.RWMutex
	promptTokens     int64
	completionTokens int64
	totalTokens      int64
}

func NewTokenCollector() TokenCollector {
	return &DefaultTokenCollector{}
}

func (c *DefaultTokenCollector) AddTokens(promptTokens, completionTokens, totalTokens int64) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.promptTokens += promptTokens
	c.completionTokens += completionTokens
	c.totalTokens += totalTokens
}

func (c *DefaultTokenCollector) GetSummary() arkv1alpha1.TokenUsage {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return arkv1alpha1.TokenUsage{
		PromptTokens:     c.promptTokens,
		CompletionTokens: c.completionTokens,
		TotalTokens:      c.totalTokens,
	}
}

func (c *DefaultTokenCollector) Reset() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.promptTokens = 0
	c.completionTokens = 0
	c.totalTokens = 0
}
