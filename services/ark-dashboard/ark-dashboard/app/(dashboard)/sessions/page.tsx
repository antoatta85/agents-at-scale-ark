'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetSessions } from '@/lib/services/sessions-hooks';

export default function SessionsPage() {
  const { data: sessions, isLoading, error } = useGetSessions();

  return (
    <div className="bg-background min-h-screen">
      <PageHeader currentPage="Sessions" />
      <main className="container space-y-8 p-6 py-8">
        <section>
          <h2 className="mb-2 text-3xl font-bold text-balance">Sessions</h2>
          <p className="text-muted-foreground text-pretty">
            View and explore agentic workflow sessions with hierarchical tree views.
          </p>
        </section>

        <section>
          {isLoading && <p>Loading sessions...</p>}
          
          {error && (
            <div className="text-red-500">
              Error loading sessions: {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </div>
          )}

          {!isLoading && !error && sessions && sessions.length === 0 && (
            <p className="text-muted-foreground">
              No sessions found. Ingest OTEL traces or add messages to create sessions.
            </p>
          )}

          {!isLoading && !error && sessions && sessions.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions.map((sessionId) => (
                <Link key={sessionId} href={`/sessions/${sessionId}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle className="truncate">{sessionId}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Click to view details</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

