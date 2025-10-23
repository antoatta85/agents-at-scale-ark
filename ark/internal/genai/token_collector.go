/* Copyright 2025. McKinsey & Company */

package genai

import (
	"context"
	"sync"
)

type TokenUsageCollector struct {
	recorder    EventEmitter
	mu          sync.RWMutex
	tokenUsages []TokenUsage
	// A2A context ID collected deep in the query execution flow (similar to token usage).
	// In time this structure will be generalized into a query state collector.
	a2aContextID string
}

func NewTokenUsageCollector(recorder EventEmitter) *TokenUsageCollector {
	return &TokenUsageCollector{
		recorder:    recorder,
		tokenUsages: make([]TokenUsage, 0),
	}
}

func (c *TokenUsageCollector) EmitEvent(ctx context.Context, eventType, reason string, data EventData) {
	c.recorder.EmitEvent(ctx, eventType, reason, data)

	if opEvent, ok := data.(OperationEvent); ok && opEvent.TokenUsage.TotalTokens > 0 {
		c.mu.Lock()
		c.tokenUsages = append(c.tokenUsages, opEvent.TokenUsage)
		c.mu.Unlock()
	}
}

func (c *TokenUsageCollector) GetTokenSummary() TokenUsage {
	c.mu.RLock()
	defer c.mu.RUnlock()

	var total TokenUsage
	for _, usage := range c.tokenUsages {
		total.PromptTokens += usage.PromptTokens
		total.CompletionTokens += usage.CompletionTokens
		total.TotalTokens += usage.TotalTokens
	}

	return total
}

func (c *TokenUsageCollector) Reset() {
	c.mu.Lock()
	c.tokenUsages = make([]TokenUsage, 0)
	c.a2aContextID = ""
	c.mu.Unlock()
}

func (c *TokenUsageCollector) SetA2AContextID(contextID string) {
	c.mu.Lock()
	c.a2aContextID = contextID
	c.mu.Unlock()
}

func (c *TokenUsageCollector) GetA2AContextID() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.a2aContextID
}
