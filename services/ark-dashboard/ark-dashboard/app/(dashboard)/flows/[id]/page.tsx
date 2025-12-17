'use client';

import { Copy, Sparkle, Workflow } from 'lucide-react';
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

const MOCK_FLOWS: Flow[] = [
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    title: 'Customer Onboarding Flow',
    description: 'Automated workflow for onboarding new customers',
    stages: 5,
  },
  {
    id: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
    title: 'Invoice Processing',
    description: 'Extract and process invoice data from documents',
    stages: 3,
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    stages: 4,
  },
  {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    title: 'Content Moderation Pipeline',
    description: 'Review and moderate user-generated content',
    stages: 6,
  },
  {
    id: '9f4e7c3a-5d6b-4e8f-9a2b-1c3d4e5f6a7b',
    title: 'Data Validation Workflow',
    stages: 4,
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

  const isComposerFlow = !!(flow.title && flow.description);

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        currentPage={flow.title || flow.id}
      />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Workflow className="text-muted-foreground h-8 w-8" />
                {isComposerFlow && (
                  <Sparkle className="absolute -top-1 -right-1 h-3 w-3 fill-primary text-primary opacity-60" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium font-mono">{flow.id}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleCopyId}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {flow.title && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {flow.title}
                  </p>
                )}
                {flow.description && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {flow.description}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </>
  );
}
