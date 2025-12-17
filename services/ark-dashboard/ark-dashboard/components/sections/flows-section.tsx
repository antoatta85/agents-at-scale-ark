'use client';

import { useState } from 'react';

import { type Flow, FlowRow } from '@/components/rows/flow-row';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { DASHBOARD_SECTIONS } from '@/lib/constants';
import { useDelayedLoading } from '@/lib/hooks';

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

export function FlowsSection() {
  const [flows] = useState<Flow[]>(MOCK_FLOWS);
  const [loading] = useState(false);
  const showLoading = useDelayedLoading(loading);

  if (showLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="py-8 text-center">Loading...</div>
      </div>
    );
  }

  if (flows.length === 0 && !loading) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <DASHBOARD_SECTIONS.flows.icon />
          </EmptyMedia>
          <EmptyTitle>No Flows Yet</EmptyTitle>
          <EmptyDescription>
            You haven&apos;t created any flows yet. Get started by creating your
            first flow.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent></EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-auto px-6 py-6">
        <div className="flex flex-col gap-3">
          {flows.map(flow => (
            <FlowRow key={flow.id} flow={flow} />
          ))}
        </div>
      </main>
    </div>
  );
}
