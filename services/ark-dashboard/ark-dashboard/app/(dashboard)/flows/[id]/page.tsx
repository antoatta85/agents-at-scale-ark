'use client';

import { Workflow } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { BreadcrumbElement } from '@/components/common/page-header';
import { PageHeader } from '@/components/common/page-header';
import type { Flow } from '@/components/rows/flow-row';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const MOCK_FLOWS: Flow[] = [
  {
    id: '1',
    title: 'Customer Onboarding Flow',
    description: 'Automated workflow for onboarding new customers',
    stages: 5,
  },
  {
    id: '2',
    title: 'Invoice Processing',
    description: 'Extract and process invoice data from documents',
    stages: 3,
  },
  {
    id: '3',
    title: 'Support Ticket Triage',
    description: 'Classify and route support tickets to appropriate teams',
    stages: 4,
  },
  {
    id: '4',
    title: 'Content Moderation Pipeline',
    description: 'Review and moderate user-generated content',
    stages: 6,
  },
  {
    id: '5',
    title: 'Data Validation Workflow',
    description: 'Validate and clean incoming data from multiple sources',
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

  return (
    <>
      <PageHeader breadcrumbs={breadcrumbs} currentPage={flow.title} />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Workflow className="text-muted-foreground h-8 w-8" />
              <div>
                <CardTitle>{flow.title}</CardTitle>
                <CardDescription>{flow.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Flow ID</h3>
                <p className="text-muted-foreground text-sm">{flow.id}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Number of Stages</h3>
                <p className="text-muted-foreground text-sm">{flow.stages}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stages</CardTitle>
            <CardDescription>
              This flow consists of {flow.stages}{' '}
              {flow.stages === 1 ? 'stage' : 'stages'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Stage details coming soon...
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
