'use client';

import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import type { BreadcrumbElement } from '@/components/common/page-header';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetSession } from '@/lib/services/sessions-hooks';

const breadcrumbs: BreadcrumbElement[] = [
  { href: '/', label: 'ARK Dashboard' },
  { href: '/sessions', label: 'Sessions' },
];

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const { data: session, isLoading, error } = useGetSession(sessionId);

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
          <h2 className="mb-2 text-3xl font-bold text-balance">Session {sessionId}</h2>
          <p className="text-muted-foreground text-pretty">
            Hierarchical view of queries, conversations, and events.
          </p>
        </section>

        {/* Queries Section */}
        <section>
          <h3 className="mb-4 text-xl font-semibold">Queries</h3>
          {session.queries && session.queries.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {session.queries.map((query) => (
                <Card key={query.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{query.name || query.id}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Status: </span>
                        <span className={query.status === 'completed' ? 'text-green-600' : 'text-blue-600'}>
                          {query.status}
                        </span>
                      </div>
                      {query.duration_ms !== null && (
                        <div>
                          <span className="font-medium">Duration: </span>
                          <span>{(query.duration_ms / 1000).toFixed(2)}s</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No queries found for this session.</p>
          )}
        </section>

        {/* Conversations Section */}
        <section>
          <h3 className="mb-4 text-xl font-semibold">Conversations</h3>
          {session.conversations && session.conversations.length > 0 ? (
            <div className="space-y-4">
              {session.conversations.map((conversation) => (
                <Card key={conversation.id}>
                  <CardHeader>
                    <CardTitle className="text-base">Conversation {conversation.id}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {conversation.firstMessage && (
                        <div>
                          <div className="mb-1 text-xs font-medium text-muted-foreground">First Message</div>
                          <div className="rounded bg-gray-50 p-3 dark:bg-gray-900/50">
                            <div className="mb-1 text-xs font-medium">
                              {conversation.firstMessage.role || 'user'}
                            </div>
                            <div className="text-sm">
                              {typeof conversation.firstMessage.content === 'string'
                                ? conversation.firstMessage.content
                                : JSON.stringify(conversation.firstMessage.content, null, 2)}
                            </div>
                          </div>
                        </div>
                      )}
                      {conversation.lastMessage && (
                        <div>
                          <div className="mb-1 text-xs font-medium text-muted-foreground">Last Message</div>
                          <div className="rounded bg-gray-50 p-3 dark:bg-gray-900/50">
                            <div className="mb-1 text-xs font-medium">
                              {conversation.lastMessage.role || 'assistant'}
                            </div>
                            <div className="text-sm">
                              {typeof conversation.lastMessage.content === 'string'
                                ? conversation.lastMessage.content
                                : JSON.stringify(conversation.lastMessage.content, null, 2)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No conversations found for this session.</p>
          )}
        </section>
      </main>
    </div>
  );
}

