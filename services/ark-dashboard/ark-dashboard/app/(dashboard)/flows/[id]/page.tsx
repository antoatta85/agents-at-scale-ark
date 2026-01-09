'use client';

import { Copy, Download, FileCode, Network, Sparkle, Workflow } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { BreadcrumbElement } from '@/components/common/page-header';
import { PageHeader } from '@/components/common/page-header';
import type { Flow } from '@/components/rows/flow-row';
import { workflowTemplatesService } from '@/lib/services/workflow-templates';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkflowDagViewer } from '@/components/workflow-dag-viewer';

const EXAMPLE_MANIFEST = `apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: hello-world-
spec:
  entrypoint: whalesay
  templates:
  - name: whalesay
    container:
      image: docker/whalesay
      command: [cowsay]
      args: ["hello world"]`;

const STEPS_MANIFEST = `apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: steps-workflow-
spec:
  entrypoint: main-steps
  templates:
  - name: main-steps
    steps:
    - - name: init
        template: initialize

    - - name: fetch-users
        template: fetch-data
      - name: fetch-products
        template: fetch-data
      - name: fetch-orders
        template: fetch-data

    - - name: process-users
        template: process-data
      - name: process-products
        template: process-data
      - name: process-orders
        template: process-data

    - - name: validate-users
        template: validate
      - name: validate-products
        template: validate
      - name: validate-orders
        template: validate

    - - name: aggregate
        template: merge-data

    - - name: index-search
        template: build-index
      - name: cache-warm
        template: warm-cache
      - name: metrics-update
        template: update-metrics

    - - name: health-check
        template: verify

    - - name: deploy-staging
        template: deploy
      - name: deploy-backup
        template: deploy

    - - name: smoke-test
        template: test

    - - name: notify-success
        template: send-notification

  - name: initialize
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Initializing workflow"]

  - name: fetch-data
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Fetching data"]

  - name: process-data
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Processing data"]

  - name: validate
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Validating data"]

  - name: merge-data
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Merging data"]

  - name: build-index
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Building search index"]

  - name: warm-cache
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Warming cache"]

  - name: update-metrics
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Updating metrics"]

  - name: verify
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Running health check"]

  - name: deploy
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Deploying application"]

  - name: test
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Running smoke tests"]

  - name: send-notification
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Sending notification"]`;

const LARGE_MANIFEST = `apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: complex-data-pipeline-
  labels:
    workflows.argoproj.io/archive-strategy: "false"
  annotations:
    workflows.argoproj.io/description: |
      This is a complex multi-stage data processing pipeline that demonstrates
      various Argo Workflows features including DAG execution, parameter passing,
      conditional execution, and artifact management across multiple stages.
spec:
  entrypoint: main-dag
  arguments:
    parameters:
    - name: data-source
      value: "s3://my-bucket/input-data"
    - name: processing-mode
      value: "batch"
    - name: batch-size
      value: "1000"
    - name: parallel-workers
      value: "5"

  volumeClaimTemplates:
  - metadata:
      name: workdir
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi

  templates:
  - name: main-dag
    dag:
      tasks:
      - name: validate-input
        template: validate
        arguments:
          parameters:
          - name: source
            value: "{{workflow.parameters.data-source}}"

      - name: extract-data
        dependencies: [validate-input]
        template: extract-data
        arguments:
          parameters:
          - name: source
            value: "{{workflow.parameters.data-source}}"
          - name: batch-size
            value: "{{workflow.parameters.batch-size}}"

      - name: transform-batch-1
        dependencies: [extract-data]
        template: transform-data
        arguments:
          parameters:
          - name: batch-id
            value: "batch-1"
          artifacts:
          - name: raw-data
            from: "{{tasks.extract-data.outputs.artifacts.extracted-data}}"

      - name: transform-batch-2
        dependencies: [extract-data]
        template: transform-data
        arguments:
          parameters:
          - name: batch-id
            value: "batch-2"
          artifacts:
          - name: raw-data
            from: "{{tasks.extract-data.outputs.artifacts.extracted-data}}"

      - name: transform-batch-3
        dependencies: [extract-data]
        template: transform-data
        arguments:
          parameters:
          - name: batch-id
            value: "batch-3"
          artifacts:
          - name: raw-data
            from: "{{tasks.extract-data.outputs.artifacts.extracted-data}}"

      - name: validate-batch-1
        dependencies: [transform-batch-1]
        template: validate-quality
        arguments:
          artifacts:
          - name: processed-data
            from: "{{tasks.transform-batch-1.outputs.artifacts.transformed-data}}"

      - name: validate-batch-2
        dependencies: [transform-batch-2]
        template: validate-quality
        arguments:
          artifacts:
          - name: processed-data
            from: "{{tasks.transform-batch-2.outputs.artifacts.transformed-data}}"

      - name: validate-batch-3
        dependencies: [transform-batch-3]
        template: validate-quality
        arguments:
          artifacts:
          - name: processed-data
            from: "{{tasks.transform-batch-3.outputs.artifacts.transformed-data}}"

      - name: merge-results
        dependencies: [validate-batch-1, validate-batch-2, validate-batch-3]
        template: merge-data
        arguments:
          artifacts:
          - name: batch-1
            from: "{{tasks.validate-batch-1.outputs.artifacts.validated-data}}"
          - name: batch-2
            from: "{{tasks.validate-batch-2.outputs.artifacts.validated-data}}"
          - name: batch-3
            from: "{{tasks.validate-batch-3.outputs.artifacts.validated-data}}"

      - name: quality-check
        dependencies: [merge-results]
        template: final-quality-check
        arguments:
          artifacts:
          - name: merged-data
            from: "{{tasks.merge-results.outputs.artifacts.merged-data}}"

      - name: load-warehouse
        dependencies: [quality-check]
        template: load-data
        when: "{{tasks.quality-check.outputs.result}} == Passed"
        arguments:
          artifacts:
          - name: final-data
            from: "{{tasks.merge-results.outputs.artifacts.merged-data}}"

      - name: generate-stats
        dependencies: [quality-check]
        template: compute-statistics
        arguments:
          artifacts:
          - name: data
            from: "{{tasks.merge-results.outputs.artifacts.merged-data}}"

      - name: create-backup
        dependencies: [quality-check]
        template: backup-data
        arguments:
          artifacts:
          - name: data
            from: "{{tasks.merge-results.outputs.artifacts.merged-data}}"

      - name: final-report
        dependencies: [load-warehouse, generate-stats, create-backup]
        template: create-report
        arguments:
          parameters:
          - name: warehouse-location
            value: "{{tasks.load-warehouse.outputs.parameters.location}}"
          - name: stats-summary
            value: "{{tasks.generate-stats.outputs.parameters.summary}}"
          - name: backup-location
            value: "{{tasks.create-backup.outputs.parameters.location}}"

      - name: send-notification
        dependencies: [final-report]
        template: notify
        arguments:
          parameters:
          - name: status
            value: "success"
          - name: report-url
            value: "{{tasks.final-report.outputs.parameters.report-url}}"

  - name: validate
    inputs:
      parameters:
      - name: source
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Validating data source {{inputs.parameters.source}} && sleep 2"]

  - name: extract-data
    inputs:
      parameters:
      - name: source
      - name: batch-size
    outputs:
      artifacts:
      - name: extracted-data
        path: /tmp/extracted-data.json
    container:
      image: python:3.9
      command: [python]
      args: ["-c", "import json; import time; data={'records': [{'id': i} for i in range(100)]}; time.sleep(5); open('/tmp/extracted-data.json', 'w').write(json.dumps(data))"]
      resources:
        requests:
          memory: "512Mi"
          cpu: "500m"
        limits:
          memory: "1Gi"
          cpu: "1000m"

  - name: transform-data
    inputs:
      parameters:
      - name: mode
      - name: workers
      artifacts:
      - name: raw-data
        path: /tmp/raw-data.json
    outputs:
      artifacts:
      - name: transformed-data
        path: /tmp/transformed-data.json
    container:
      image: python:3.9
      command: [python]
      args:
      - "-c"
      - |
        import json
        import time
        with open('/tmp/raw-data.json') as f:
          data = json.load(f)
        # Simulate transformation
        time.sleep(10)
        transformed = {'processed': len(data['records']), 'mode': '{{inputs.parameters.mode}}'}
        with open('/tmp/transformed-data.json', 'w') as f:
          json.dump(transformed, f)
      resources:
        requests:
          memory: "1Gi"
          cpu: "1000m"
        limits:
          memory: "2Gi"
          cpu: "2000m"

  - name: validate-quality
    inputs:
      artifacts:
      - name: processed-data
        path: /tmp/data.json
    outputs:
      result:
        value: "Passed"
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Running quality checks && sleep 3 && echo Passed"]

  - name: load-data
    inputs:
      artifacts:
      - name: final-data
        path: /tmp/final-data.json
    outputs:
      parameters:
      - name: location
        valueFrom:
          path: /tmp/warehouse-location.txt
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo 'warehouse://processed-data/batch-001' > /tmp/warehouse-location.txt && sleep 5"]

  - name: create-report
    inputs:
      parameters:
      - name: warehouse-location
    outputs:
      parameters:
      - name: report-url
        value: "https://reports.example.com/pipeline-report-{{workflow.name}}.html"
    container:
      image: alpine:latest
      command: [sh, -c]
      args: ["echo Generating report for {{inputs.parameters.warehouse-location}} && sleep 3"]

  - name: notify
    inputs:
      parameters:
      - name: status
      - name: report-url
    container:
      image: curlimages/curl:latest
      command: [sh, -c]
      args:
      - |
        echo "Sending notification: Pipeline {{inputs.parameters.status}}"
        echo "Report available at: {{inputs.parameters.report-url}}"
        sleep 2`;

const MOCK_FLOWS: Flow[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    title: 'Customer Onboarding Flow',
    description: 'Automated workflow for onboarding new customers',
    stages: 5,
    manifest: EXAMPLE_MANIFEST,
  },
  {
    id: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
    title: 'Invoice Processing',
    description: 'Extract and process invoice data from documents',
    stages: 3,
    manifest: EXAMPLE_MANIFEST,
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    stages: 4,
    manifest: EXAMPLE_MANIFEST,
  },
  {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    title: 'Content Moderation Pipeline',
    description: 'Review and moderate user-generated content',
    stages: 6,
    manifest: EXAMPLE_MANIFEST,
  },
  {
    id: '9f4e7c3a-5d6b-4e8f-9a2b-1c3d4e5f6a7b',
    title: 'Data Validation Workflow',
    stages: 4,
    manifest: EXAMPLE_MANIFEST,
  },
  {
    id: 'd8e9f0a1-2b3c-4d5e-6f7a-8b9c0d1e2f3a',
    title: 'Enterprise-Grade Multi-Stage Data Processing Pipeline with Advanced Quality Checks, Automated Reporting, and Real-Time Notification System',
    description: 'This comprehensive workflow orchestrates a complex data pipeline that extracts data from multiple sources, performs sophisticated transformations using parallel processing, validates data quality through multiple checkpoints, loads the processed data into a distributed data warehouse, generates detailed analytical reports with visualizations, and sends real-time notifications to stakeholders across various communication channels including email, Slack, and webhooks',
    stages: 8,
    manifest: LARGE_MANIFEST,
  },
  {
    id: 'e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b',
    title: 'Multi-Stage Deployment Pipeline',
    description: 'Step-based workflow demonstrating parallel data fetching, processing, validation, deployment, and testing across multiple environments with comprehensive monitoring and notification',
    stages: 10,
    manifest: STEPS_MANIFEST,
  },
];

export default function FlowDetailPage() {
  const params = useParams();
  const flowId = params.id as string;
  const [flow, setFlow] = useState<Flow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFlow() {
      try {
        setLoading(true);
        setError(null);

        const [template, yamlManifest] = await Promise.all([
          workflowTemplatesService.get(flowId),
          workflowTemplatesService.getYaml(flowId),
        ]);

        const annotations = template.metadata.annotations || {};
        const flowData: Flow = {
          id: template.metadata.name,
          title: annotations['workflows.argoproj.io/title'],
          description: annotations['workflows.argoproj.io/description'],
          stages: 0,
          manifest: yamlManifest,
        };

        setFlow(flowData);
      } catch (err) {
        console.error('Failed to fetch workflow template:', err);
        setError('Failed to load flow');
        setFlow(null);
      } finally {
        setLoading(false);
      }
    }

    fetchFlow();
  }, [flowId]);

  const breadcrumbs: BreadcrumbElement[] = [
    { href: '/', label: 'ARK Dashboard' },
    { href: '/flows', label: 'Flows' },
  ];

  if (loading) {
    return (
      <>
        <PageHeader breadcrumbs={breadcrumbs} currentPage="Loading..." />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Loading flow...</p>
        </div>
      </>
    );
  }

  if (error || !flow) {
    return (
      <>
        <PageHeader breadcrumbs={breadcrumbs} currentPage="Flow Not Found" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">{error || 'Flow not found'}</p>
        </div>
      </>
    );
  }

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(flow.id);
      toast.success('Copied', {
        description: 'Flow ID copied to clipboard',
      });
    } catch (error) {
      toast.error('Failed to copy', {
        description: 'Could not copy flow ID to clipboard',
      });
    }
  };

  const handleCopyManifest = async () => {
    if (!flow.manifest) return;
    try {
      await navigator.clipboard.writeText(flow.manifest);
      toast.success('Copied', {
        description: 'Manifest copied to clipboard',
      });
    } catch (error) {
      toast.error('Failed to copy', {
        description: 'Could not copy manifest to clipboard',
      });
    }
  };

  const handleDownloadManifest = () => {
    if (!flow.manifest) return;
    const blob = new Blob([flow.manifest], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flow.id}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isComposerFlow = !!(flow.title && flow.description);

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        currentPage={flow.title || flow.id}
      />
      <div className="flex flex-col gap-6 p-6">
        <div className="bg-card flex w-full flex-wrap items-center gap-4 rounded-md border px-4 py-3">
          <div className="flex flex-grow items-center gap-3 overflow-hidden">
            <div className="relative p-2">
              <Workflow className="text-muted-foreground h-8 w-8 flex-shrink-0" />
              {isComposerFlow && (
                <Sparkle className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 fill-primary text-primary opacity-60" />
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-medium font-mono" title={flow.id}>
                  {flow.id}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 cursor-pointer"
                  onClick={handleCopyId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {flow.title && (
                <p className="text-muted-foreground truncate text-sm font-medium" title={flow.title}>
                  {flow.title}
                </p>
              )}
              {flow.description && (
                <p
                  className="text-muted-foreground truncate text-sm"
                  title={flow.description}>
                  {flow.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-muted-foreground flex items-center gap-1 text-sm">
              <span className="font-medium">{flow.stages}</span>
              <span>{flow.stages === 1 ? 'stage' : 'stages'}</span>
            </div>
          </div>
        </div>

        {flow.manifest && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Workflow Manifest</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleCopyManifest}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleDownloadManifest}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="yaml">
                <TabsList>
                  <TabsTrigger value="yaml">
                    <FileCode className="mr-2 h-4 w-4" />
                    YAML
                  </TabsTrigger>
                  <TabsTrigger value="tree">
                    <Network className="mr-2 h-4 w-4" />
                    Tree
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="yaml">
                  <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-xs font-mono">
                    <code>{flow.manifest}</code>
                  </pre>
                </TabsContent>
                <TabsContent value="tree">
                  <WorkflowDagViewer manifest={flow.manifest} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
