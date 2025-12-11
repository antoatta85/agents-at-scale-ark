'use client';

import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import type { BreadcrumbElement } from '@/components/common/page-header';
import { PageHeader } from '@/components/common/page-header';
import { SessionTreeView } from '@/components/sessions/session-tree-view';
import { Button } from '@/components/ui/button';
import { useGetSession } from '@/lib/services/sessions-hooks';

const breadcrumbs: BreadcrumbElement[] = [
  { href: '/', label: 'ARK Dashboard' },
  { href: '/sessions', label: 'Sessions' },
];

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { data: session, isLoading, error, refetch } = useGetSession(sessionId);

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <PageHeader breadcrumbs={breadcrumbs} currentPage={`Session ${sessionId}`} />
        <main className="container space-y-8 p-6 py-8">
          <div className="text-center">Loading session...</div>
        </main>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="bg-background min-h-screen">
        <PageHeader breadcrumbs={breadcrumbs} currentPage={`Session ${sessionId}`} />
        <main className="container space-y-8 p-6 py-8">
          <div className="text-center">
            <h2 className="mb-2 text-xl font-semibold">Session Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'The requested session could not be found.'}
            </p>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sessions
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <PageHeader breadcrumbs={breadcrumbs} currentPage={sessionId} />
      <main className="container space-y-8 p-6 py-8">
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold text-balance">Session {sessionId}</h2>
              <p className="text-muted-foreground text-pretty">
                Hierarchical tree view of queries, conversations, and events.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </section>

        {/* Tree View */}
        <section>
          <SessionTreeView session={session} />
        </section>
      </main>
    </div>
  );
}

