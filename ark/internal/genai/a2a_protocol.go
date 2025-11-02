/* Copyright 2025. McKinsey & Company */

package genai

import (
	"fmt"

	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
	"trpc.group/trpc-go/trpc-a2a-go/protocol"
)

func convertPartFromProtocol(part interface{}) arkv1alpha1.A2ATaskPart {
	switch p := part.(type) {
	case *protocol.TextPart:
		return arkv1alpha1.A2ATaskPart{
			Kind: "text",
			Text: p.Text,
		}
	case *protocol.DataPart:
		return arkv1alpha1.A2ATaskPart{
			Kind: "data",
			Data: fmt.Sprintf("%v", p.Data),
		}
	case *protocol.FilePart:
		taskPart := arkv1alpha1.A2ATaskPart{
			Kind: "file",
		}
		if fileWithURI, ok := p.File.(*protocol.FileWithURI); ok {
			taskPart.URI = fileWithURI.URI
			if fileWithURI.MimeType != nil {
				taskPart.MimeType = *fileWithURI.MimeType
			}
		}
		if fileWithBytes, ok := p.File.(*protocol.FileWithBytes); ok {
			taskPart.Data = fileWithBytes.Bytes
			if fileWithBytes.MimeType != nil {
				taskPart.MimeType = *fileWithBytes.MimeType
			}
		}
		return taskPart
	default:
		return arkv1alpha1.A2ATaskPart{
			Kind: "text",
			Text: "unknown part type",
		}
	}
}

func convertArtifactsFromProtocol(protocolArtifacts []protocol.Artifact) []arkv1alpha1.A2ATaskArtifact {
	artifacts := make([]arkv1alpha1.A2ATaskArtifact, 0, len(protocolArtifacts))
	for _, artifact := range protocolArtifacts {
		var parts []arkv1alpha1.A2ATaskPart
		for _, part := range artifact.Parts {
			parts = append(parts, convertPartFromProtocol(part))
		}

		metadata := convertMetadataToStringMap(artifact.Metadata)

		if len(parts) > 0 {
			taskArtifact := arkv1alpha1.A2ATaskArtifact{
				ArtifactID: artifact.ArtifactID,
				Parts:      parts,
				Metadata:   metadata,
			}
			if artifact.Name != nil {
				taskArtifact.Name = *artifact.Name
			}
			if artifact.Description != nil {
				taskArtifact.Description = *artifact.Description
			}
			artifacts = append(artifacts, taskArtifact)
		}
	}
	return artifacts
}

func convertHistoryFromProtocol(protocolHistory []protocol.Message) []arkv1alpha1.A2ATaskMessage {
	history := make([]arkv1alpha1.A2ATaskMessage, 0, len(protocolHistory))
	for _, msg := range protocolHistory {
		var msgParts []arkv1alpha1.A2ATaskPart
		for _, part := range msg.Parts {
			msgParts = append(msgParts, convertPartFromProtocol(part))
		}

		msgMetadata := convertMetadataToStringMap(msg.Metadata)

		if len(msgParts) > 0 {
			historyMessage := arkv1alpha1.A2ATaskMessage{
				Role:     string(msg.Role),
				Parts:    msgParts,
				Metadata: msgMetadata,
			}
			history = append(history, historyMessage)
		}
	}
	return history
}

func convertStatusMessageFromProtocol(statusMessage *protocol.Message) (*arkv1alpha1.A2ATaskMessage, []arkv1alpha1.A2ATaskPart) {
	if statusMessage == nil {
		return nil, nil
	}

	msgParts := make([]arkv1alpha1.A2ATaskPart, 0, len(statusMessage.Parts))
	for _, part := range statusMessage.Parts {
		msgParts = append(msgParts, convertPartFromProtocol(part))
	}

	msgMetadata := convertMetadataToStringMap(statusMessage.Metadata)

	message := &arkv1alpha1.A2ATaskMessage{
		Role:     string(statusMessage.Role),
		Parts:    msgParts,
		Metadata: msgMetadata,
	}

	return message, msgParts
}

func convertMetadataToStringMap(metadata map[string]any) map[string]string {
	result := make(map[string]string)
	for k, v := range metadata {
		result[k] = fmt.Sprintf("%v", v)
	}
	return result
}

// PopulateA2ATaskStatusFromProtocol populates A2ATaskStatus fields from a protocol.Task
func PopulateA2ATaskStatusFromProtocol(status *arkv1alpha1.A2ATaskStatus, task *protocol.Task) {
	artifacts := convertArtifactsFromProtocol(task.Artifacts)
	history := convertHistoryFromProtocol(task.History)
	taskMetadata := convertMetadataToStringMap(task.Metadata)

	message, msgParts := convertStatusMessageFromProtocol(task.Status.Message)
	if len(msgParts) > 0 {
		history = append(history, *message)
	}

	status.ProtocolState = string(task.Status.State)
	status.SessionID = task.ContextID
	status.Artifacts = artifacts
	status.History = history
	status.ProtocolMetadata = taskMetadata
	status.LastStatusMessage = message
	status.LastStatusTimestamp = task.Status.Timestamp
}
