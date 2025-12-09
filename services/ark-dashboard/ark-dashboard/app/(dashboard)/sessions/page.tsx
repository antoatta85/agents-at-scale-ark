import type { BreadcrumbElement } from '@/components/common/page-header';
import { PageHeader } from '@/components/common/page-header';
import { SessionsSectionClient } from '@/components/sections/sessions-section-client';
import { sessionsService } from '@/lib/services/sessions';

const breadcrumbs: BreadcrumbElement[] = [
  { href: '/', label: 'ARK Dashboard' },
];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SessionsPage() {
  const { sessions, unmappedTraces } = await sessionsService.getSessions(1000);

  return (
    <>
      <PageHeader breadcrumbs={breadcrumbs} currentPage="Sessions" />
      <div className="flex flex-1 flex-col">
        <SessionsSectionClient
          initialSessions={sessions}
          initialUnmappedTraces={unmappedTraces}
        />
      </div>
    </>
  );
}
