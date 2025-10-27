{{/*
Expand the name of the chart.
*/}}
{{- define "ark-demos.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "ark-demos.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "ark-demos.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "ark-demos.labels" -}}
helm.sh/chart: {{ include "ark-demos.chart" . }}
{{ include "ark-demos.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "ark-demos.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ark-demos.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "ark-demos.serviceAccountName" -}}
{{- if .Values.security.serviceAccount.create }}
{{- default (printf "%s-sa" (include "ark-demos.fullname" .)) .Values.security.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.security.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Demo labels for specific demos
*/}}
{{- define "ark-demos.demoLabels" -}}
demo.ark.mckinsey.com/name: {{ .name | quote }}
demo.ark.mckinsey.com/complexity: {{ .complexity | quote }}
demo.ark.mckinsey.com/category: {{ .category | quote }}
{{- end }}

{{/*
Check if a demo is enabled
*/}}
{{- define "ark-demos.isDemoEnabled" -}}
{{- if and (hasKey .Values.demos .demo) (get .Values.demos .demo) (get (get .Values.demos .demo) "enabled") -}}
true
{{- else -}}
false
{{- end -}}
{{- end }}
