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
	// A2A metadata collected deep in the query execution flow (similar to token usage).
	// This will be extracted into a generalized query state collector at a later date.
	a2aContextID string
	a2aTaskID    string
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
	c.a2aTaskID = ""
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

func (c *TokenUsageCollector) SetA2ATaskID(taskID string) {
	c.mu.Lock()
	c.a2aTaskID = taskID
	c.mu.Unlock()
}

func (c *TokenUsageCollector) GetA2ATaskID() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.a2aTaskID
}
