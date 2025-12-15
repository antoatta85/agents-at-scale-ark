'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { BreadcrumbElement } from '@/components/common/page-header';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbElement[] = [
  { href: '/', label: 'ARK Dashboard' },
];

interface StreamEntry {
  id: string;
  timestamp: string;
  data: unknown;
}

function useSSEStream(endpoint: string, enabled: boolean) {
  const [entries, setEntries] = useState<StreamEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setError(null);
    const eventSource = new EventSource(`/api${endpoint}?watch=true`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error.message || 'Stream error');
          return;
        }
        const entry: StreamEntry = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          data,
        };
        setEntries(prev => [...prev.slice(-99), entry]);
      } catch {
        console.error('Failed to parse SSE data:', event.data);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError('Connection lost');
      eventSource.close();
    };
  }, [endpoint]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [enabled, connect, disconnect]);

  return { entries, isConnected, error, connect, disconnect, clear };
}

interface StreamViewProps {
  title: string;
  endpoint: string;
  emptyMessage: string;
}

function StreamView({ title, endpoint, emptyMessage }: StreamViewProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { entries, isConnected, error, connect, clear } = useSSEStream(
    endpoint,
    streaming,
  );

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`}
          />
          <span className="text-muted-foreground text-xs">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStreaming(!streaming)}>
            {streaming ? 'Stop' : 'Start'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              connect();
            }}
            disabled={!streaming}>
            Reconnect
          </Button>
          <Button variant="outline" size="sm" onClick={clear}>
            Clear
          </Button>
          <Button
            variant={autoScroll ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}>
            Auto-scroll
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {error && (
          <div className="mb-2 rounded bg-red-100 p-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div
          ref={containerRef}
          className="bg-muted h-[calc(100vh-320px)] overflow-auto rounded-md p-2 font-mono text-xs">
          {entries.length === 0 ? (
            <div className="text-muted-foreground flex h-full items-center justify-center">
              {streaming ? 'Waiting for data...' : emptyMessage}
            </div>
          ) : (
            entries.map(entry => (
              <div
                key={entry.id}
                className="border-border mb-1 border-b pb-1 last:border-b-0">
                <div className="text-muted-foreground mb-0.5 text-[10px]">
                  {entry.timestamp}
                </div>
                <pre className="break-all whitespace-pre-wrap">
                  {JSON.stringify(entry.data, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BrokerPage() {
  return (
    <>
      <PageHeader breadcrumbs={breadcrumbs} currentPage="Broker" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="text-muted-foreground text-sm">
          Real-time diagnostic view of broker data streams. Enable streaming to
          see live data.
        </div>
        <Tabs defaultValue="traces" className="flex-1">
          <TabsList>
            <TabsTrigger value="traces">OTEL Traces</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="chunks">LLM Chunks</TabsTrigger>
          </TabsList>
          <TabsContent value="traces" className="mt-4 flex-1">
            <StreamView
              title="OTEL Traces"
              endpoint="/v1/broker/traces"
              emptyMessage="Click Start to stream OTEL traces"
            />
          </TabsContent>
          <TabsContent value="messages" className="mt-4 flex-1">
            <StreamView
              title="Messages"
              endpoint="/v1/broker/messages"
              emptyMessage="Click Start to stream messages"
            />
          </TabsContent>
          <TabsContent value="chunks" className="mt-4 flex-1">
            <StreamView
              title="LLM Chunks"
              endpoint="/v1/broker/chunks"
              emptyMessage="Click Start to stream LLM chunks"
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
