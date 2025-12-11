'use client';

import { RefreshCw, Search, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useGetSessions } from '@/lib/services/sessions-hooks';

export default function SessionsPage() {
  const { data: sessions, isLoading, error, refetch } = useGetSessions();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions?.filter((sessionId) =>
    sessionId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-background min-h-screen">
      <PageHeader currentPage="Sessions" />
      <main className="container space-y-8 p-6 py-8">
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold text-balance">Sessions</h2>
              <p className="text-muted-foreground text-pretty">
                View and explore agentic workflow sessions with hierarchical tree views.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </section>

        <section>
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-2 text-muted-foreground">Loading sessions...</p>
            </div>
          )}

          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="text-center text-destructive">
                  <p className="font-semibold">Error loading sessions</p>
                  <p className="text-sm mt-1">
                    {error instanceof Error ? error.message : 'An unexpected error occurred'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && sessions && sessions.length > 0 && (
            <>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search sessions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {searchQuery && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {filteredSessions?.length || 0} of {sessions.length} sessions
                  </p>
                )}
              </div>

              {filteredSessions && filteredSessions.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center text-muted-foreground">
                      <p>No sessions match "{searchQuery}"</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredSessions?.map((sessionId) => (
                    <Link key={sessionId} href={`/sessions/${sessionId}`}>
                      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            <CardTitle className="truncate text-base">{sessionId}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Click to view details</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {!isLoading && !error && sessions && sessions.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Zap className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-semibold">No sessions found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ingest OTEL traces or add messages to create sessions.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}

