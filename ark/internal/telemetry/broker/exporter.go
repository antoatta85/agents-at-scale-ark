/* Copyright 2025. McKinsey & Company */

package broker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"go.opentelemetry.io/otel/sdk/trace"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
)

var log = logf.Log.WithName("telemetry.broker")

type SpanData struct {
	TraceID      string                 `json:"traceId"`
	SpanID       string                 `json:"spanId"`
	ParentSpanID string                 `json:"parentSpanId,omitempty"`
	Name         string                 `json:"name"`
	Kind         int                    `json:"kind"`
	StartTime    string                 `json:"startTimeUnixNano"`
	EndTime      string                 `json:"endTimeUnixNano"`
	Attributes   []AttributeData        `json:"attributes,omitempty"`
	Status       *StatusData            `json:"status,omitempty"`
	Resource     map[string]interface{} `json:"resource,omitempty"`
}

type AttributeData struct {
	Key   string      `json:"key"`
	Value interface{} `json:"value"`
}

type StatusData struct {
	Code    int    `json:"code"`
	Message string `json:"message,omitempty"`
}

type Exporter struct {
	endpoint string
	client   *http.Client
}

func NewExporter() *Exporter {
	endpoint := os.Getenv("ARK_BROKER_ENDPOINT")
	if endpoint == "" {
		return nil
	}

	log.Info("creating broker exporter", "endpoint", endpoint)

	return &Exporter{
		endpoint: endpoint,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (e *Exporter) ExportSpans(ctx context.Context, spans []trace.ReadOnlySpan) error {
	if len(spans) == 0 {
		return nil
	}

	var buf bytes.Buffer
	for _, span := range spans {
		spanData := convertSpan(span)
		jsonData, err := json.Marshal(spanData)
		if err != nil {
			log.Error(err, "failed to marshal span", "spanName", span.Name())
			continue
		}
		buf.Write(jsonData)
		buf.WriteByte('\n')
	}

	if buf.Len() == 0 {
		return nil
	}

	url := fmt.Sprintf("%s/traces", e.endpoint)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, &buf)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-ndjson")

	resp, err := e.client.Do(req)
	if err != nil {
		log.Error(err, "failed to send spans to broker", "endpoint", url, "spanCount", len(spans))
		return nil
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Error(nil, "broker returned non-OK status", "status", resp.StatusCode, "body", string(body))
		return nil
	}

	log.V(1).Info("exported spans to broker", "count", len(spans))
	return nil
}

func (e *Exporter) Shutdown(ctx context.Context) error {
	log.Info("shutting down broker exporter")
	return nil
}

func convertSpan(span trace.ReadOnlySpan) SpanData {
	parentSpanID := ""
	if span.Parent().HasSpanID() {
		parentSpanID = span.Parent().SpanID().String()
	}

	attributes := make([]AttributeData, 0, len(span.Attributes()))
	for _, attr := range span.Attributes() {
		attributes = append(attributes, AttributeData{
			Key:   string(attr.Key),
			Value: convertAttributeValue(attr.Value),
		})
	}

	var status *StatusData
	if span.Status().Code != 0 || span.Status().Description != "" {
		status = &StatusData{
			Code:    int(span.Status().Code),
			Message: span.Status().Description,
		}
	}

	resource := make(map[string]interface{})
	for _, attr := range span.Resource().Attributes() {
		resource[string(attr.Key)] = convertAttributeValue(attr.Value)
	}

	return SpanData{
		TraceID:      span.SpanContext().TraceID().String(),
		SpanID:       span.SpanContext().SpanID().String(),
		ParentSpanID: parentSpanID,
		Name:         span.Name(),
		Kind:         int(span.SpanKind()),
		StartTime:    fmt.Sprintf("%d", span.StartTime().UnixNano()),
		EndTime:      fmt.Sprintf("%d", span.EndTime().UnixNano()),
		Attributes:   attributes,
		Status:       status,
		Resource:     resource,
	}
}

func convertAttributeValue(v interface{ AsInterface() interface{} }) interface{} {
	return v.AsInterface()
}
