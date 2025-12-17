'use client';

import type { BreadcrumbElement } from '@/components/common/page-header';
import { PageHeader } from '@/components/common/page-header';
import { FlowsSection } from '@/components/sections/flows-section';

const breadcrumbs: BreadcrumbElement[] = [
  { href: '/', label: 'ARK Dashboard' },
];

export default function FlowsPage() {
  return (
    <>
      <PageHeader breadcrumbs={breadcrumbs} currentPage="Flows" />
      <div className="flex flex-1 flex-col">
        <FlowsSection />
      </div>
    </>
  );
}
