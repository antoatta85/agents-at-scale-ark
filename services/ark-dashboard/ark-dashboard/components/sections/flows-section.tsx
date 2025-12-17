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
