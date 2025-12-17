'use client';

import type { BreadcrumbElement } from '@/components/common/page-header';
import { PageHeader } from '@/components/common/page-header';

const breadcrumbs: BreadcrumbElement[] = [
  { href: '/', label: 'ARK Dashboard' },
];

export default function FlowsPage() {
  return (
    <>
      <PageHeader breadcrumbs={breadcrumbs} currentPage="Flows" />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Flows page coming soon...</p>
        </div>
      </div>
    </>
  );
}
