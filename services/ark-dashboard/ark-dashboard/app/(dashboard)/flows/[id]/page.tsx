'use client';

import { Copy, Download, Sparkle, Workflow } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { BreadcrumbElement } from '@/components/common/page-header';
import { PageHeader } from '@/components/common/page-header';
import type { Flow } from '@/components/rows/flow-row';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
];

export default function FlowDetailPage() {
  const params = useParams();
  const flowId = params.id as string;
  const [flow, setFlow] = useState<Flow | null>(null);

  useEffect(() => {
    const foundFlow = MOCK_FLOWS.find(f => f.id === flowId);
    setFlow(foundFlow || null);
  }, [flowId]);

  const breadcrumbs: BreadcrumbElement[] = [
    { href: '/', label: 'ARK Dashboard' },
    { href: '/flows', label: 'Flows' },
  ];

  if (!flow) {
    return (
      <>
        <PageHeader breadcrumbs={breadcrumbs} currentPage="Flow Not Found" />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Flow not found</p>
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
            <div className="relative">
              <Workflow className="text-muted-foreground h-5 w-5 flex-shrink-0" />
              {isComposerFlow && (
                <Sparkle className="absolute -top-1 -right-1 h-2.5 w-2.5 fill-primary text-primary opacity-60" />
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
              <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-xs font-mono">
                <code>{flow.manifest}</code>
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
