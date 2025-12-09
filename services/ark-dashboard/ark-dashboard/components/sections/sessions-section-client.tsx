'use client';

import { ChevronDown, ChevronRight, Info, Network, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getSessionsAction } from '@/app/(dashboard)/sessions/actions';
import { Button } from '@/components/ui/button';
import { DASHBOARD_SECTIONS } from '@/lib/constants/dashboard-icons';
import { type Session, type QueryNode, type SpanWithChildren } from '@/lib/services/sessions';

import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '../ui/empty';

interface SpanNodeProps {
  readonly span: SpanWithChildren;
  readonly depth: number;
  readonly onShowDetails: (span: SpanWithChildren) => void;
}

function SpanNode({ span, depth, onShowDetails }: SpanNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const hasChildren = span.children.length > 0;
  const indentStyle = { paddingLeft: `${depth * 24}px` };

  const formatDuration = (nanos: string) => {
    const ns = parseInt(nanos, 10);
    if (ns < 1000) return `${ns}ns`;
    if (ns < 1000000) return `${(ns / 1000).toFixed(2)}μs`;
    if (ns < 1000000000) return `${(ns / 1000000).toFixed(2)}ms`;
    return `${(ns / 1000000000).toFixed(2)}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'STATUS_CODE_OK':
      case 'Ok':
        return 'text-green-600 dark:text-green-400';
      case 'STATUS_CODE_ERROR':
      case 'Error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <>
      <tr className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
        <td className="px-3 py-2 text-sm whitespace-nowrap" style={indentStyle}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="rounded p-0 hover:bg-gray-200 dark:hover:bg-gray-700">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <span className="font-mono text-xs text-gray-900 dark:text-gray-100">
              {span.SpanName}
            </span>
          </div>
        </td>
        <td className="px-3 py-2 text-xs whitespace-nowrap text-gray-600 dark:text-gray-400">
          {span.ServiceName}
        </td>
        <td className="px-3 py-2 text-xs whitespace-nowrap text-gray-600 dark:text-gray-400">
          {span.SpanKind}
        </td>
        <td className="px-3 py-2 text-xs whitespace-nowrap">
          {formatDuration(span.Duration)}
        </td>
        <td
          className={`px-3 py-2 text-xs whitespace-nowrap ${getStatusColor(span.StatusCode)}`}>
          {span.StatusCode.replace('STATUS_CODE_', '')}
        </td>
        <td className="px-3 py-2 text-xs whitespace-nowrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowDetails(span);
            }}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            title="Show span details">
            <Info className="h-4 w-4" />
          </button>
        </td>
      </tr>
      {isExpanded &&
        span.children.map((child, idx) => (
          <SpanNode
            key={`${child.SpanId}-${idx}`}
            span={child}
            depth={depth + 1}
            onShowDetails={onShowDetails}
          />
        ))}
    </>
  );
}

interface QueryNodeComponentProps {
  readonly queryName: string;
  readonly queryId: string;
  readonly spans: SpanWithChildren[];
  readonly spanCount: number;
  readonly onShowDetails: (span: SpanWithChildren) => void;
}

function QueryNodeComponent({
  queryName,
  queryId,
  spans,
  spanCount,
  onShowDetails,
}: QueryNodeComponentProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <>
      <tr className="border-b-2 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <td colSpan={6} className="px-3 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded p-0 hover:bg-blue-200 dark:hover:bg-blue-800">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-blue-700 dark:text-blue-300" />
              ) : (
                <ChevronRight className="h-5 w-5 text-blue-700 dark:text-blue-300" />
              )}
            </button>
            <Network className="h-5 w-5 text-blue-700 dark:text-blue-300" />
            <span className="font-semibold text-blue-900 dark:text-blue-100">
              {queryName}
            </span>
            <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
              {queryId.substring(0, 8)}
            </span>
            <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">
              {spanCount} spans
            </span>
          </div>
        </td>
      </tr>
      {isExpanded &&
        spans.map((span, idx) => (
          <SpanNode key={`${span.SpanId}-${idx}`} span={span} depth={0} onShowDetails={onShowDetails} />
        ))}
    </>
  );
}

interface SessionNodeComponentProps {
  readonly session: Session;
  readonly onShowDetails: (span: SpanWithChildren) => void;
}

function SessionNodeComponent({ session, onShowDetails }: SessionNodeComponentProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTimestamp = (ts: string) => {
    if (!ts) return '-';
    const date = new Date(ts);
    return date.toLocaleString();
  };

  return (
    <>
      <tr className="border-b-2 border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
        <td colSpan={6} className="px-3 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded p-0 hover:bg-gray-200 dark:hover:bg-gray-700">
              {isExpanded ? (
                <ChevronDown className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <ChevronRight className="h-6 w-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
            <span className="text-base font-bold text-gray-900 dark:text-gray-100">
              Session: {session.sessionId}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(session.startTime)}
            </span>
            <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
              {session.queries.length} queries • {session.spanCount} spans
            </span>
          </div>
        </td>
      </tr>
      {isExpanded &&
        session.queries.map(query => (
          <QueryNodeComponent
            key={query.queryId}
            queryName={query.queryName}
            queryId={query.queryId}
            spans={query.spans}
            spanCount={query.spanCount}
            onShowDetails={onShowDetails}
          />
        ))}
    </>
  );
}

interface SessionsSectionClientProps {
  readonly initialSessions: Session[];
  readonly initialUnmappedTraces: QueryNode[];
}

export function SessionsSectionClient({
  initialSessions,
  initialUnmappedTraces,
}: SessionsSectionClientProps) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpan, setSelectedSpan] = useState<SpanWithChildren | null>(null);
  const [unmappedTraces, setUnmappedTraces] = useState<QueryNode[]>(initialUnmappedTraces);
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(() => {
    if (initialUnmappedTraces.length > 0) {
      return new Set([initialUnmappedTraces[0].queryId]);
    }
    return new Set();
  });
  const [newTraces, setNewTraces] = useState<Set<string>>(new Set());

  const toggleTraceExpansion = (traceId: string) => {
    setExpandedTraces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(traceId)) {
        newSet.delete(traceId);
      } else {
        newSet.add(traceId);
      }
      return newSet;
    });
  };

  const loadSessions = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);

    try {
      const { sessions: newSessions, unmappedTraces: newUnmapped } = await getSessionsAction();
      setSessions(newSessions);

      const currentIds = new Set(unmappedTraces.map(t => t.queryId));
      const incomingIds = new Set(newUnmapped.map(t => t.queryId));
      const addedIds = new Set([...incomingIds].filter(id => !currentIds.has(id)));

      if (addedIds.size > 0) {
        setNewTraces(addedIds);

        setExpandedTraces(prev => {
          const newSet = new Set(prev);
          addedIds.forEach(id => newSet.add(id));
          return newSet;
        });

        setTimeout(() => {
          setNewTraces(new Set());
        }, 2000);
      }

      setUnmappedTraces(newUnmapped);
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
    } finally {
      if (showRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      loadSessions(false);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full gap-6 p-4">
      {/* Main Content - Sessions */}
      <div className="flex-1 space-y-4 overflow-auto min-w-0">
      {/* Span Details Modal */}
      {selectedSpan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedSpan(null)}>
          <div
            className="max-h-[80vh] w-full max-w-4xl overflow-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Span Details: {selectedSpan.SpanName}
              </h3>
              <button
                onClick={() => setSelectedSpan(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                  Basic Info
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Span ID:</strong> <code className="text-xs">{selectedSpan.SpanId}</code></div>
                  <div><strong>Trace ID:</strong> <code className="text-xs">{selectedSpan.TraceId}</code></div>
                  <div><strong>Parent Span ID:</strong> <code className="text-xs">{selectedSpan.ParentSpanId || 'None'}</code></div>
                  <div><strong>Service:</strong> {selectedSpan.ServiceName}</div>
                  <div><strong>Kind:</strong> {selectedSpan.SpanKind}</div>
                  <div><strong>Status:</strong> {selectedSpan.StatusCode}</div>
                  <div><strong>Duration:</strong> {selectedSpan.Duration}ns</div>
                  <div><strong>Timestamp:</strong> {selectedSpan.Timestamp}</div>
                </div>
              </div>

              {Object.keys(selectedSpan.SpanAttributes).length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                    Attributes
                  </h4>
                  <pre className="max-h-60 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
                    {JSON.stringify(selectedSpan.SpanAttributes, null, 2)}
                  </pre>
                </div>
              )}

              {Object.keys(selectedSpan.ResourceAttributes).length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                    Resource Attributes
                  </h4>
                  <pre className="max-h-60 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
                    {JSON.stringify(selectedSpan.ResourceAttributes, null, 2)}
                  </pre>
                </div>
              )}

              {selectedSpan.Events && selectedSpan.Events.length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                    Events ({selectedSpan.Events.length})
                  </h4>
                  <pre className="max-h-60 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
                    {JSON.stringify(selectedSpan.Events, null, 2)}
                  </pre>
                </div>
              )}

              {selectedSpan.Links && selectedSpan.Links.length > 0 && (
                <div>
                  <h4 className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                    Links ({selectedSpan.Links.length})
                  </h4>
                  <pre className="max-h-60 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
                    {JSON.stringify(selectedSpan.Links, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Sessions
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last 1000 spans grouped by session and query
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => loadSessions(true)}
          disabled={refreshing}>
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Span Name
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Service
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Kind
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Duration
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <DASHBOARD_SECTIONS.sessions.icon />
                        </EmptyMedia>
                        <EmptyTitle>No Sessions Yet</EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  </td>
                </tr>
              ) : (
                sessions.map(session => (
                  <SessionNodeComponent
                    key={session.sessionId}
                    session={session}
                    onShowDetails={setSelectedSpan}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Live Traces Panel - Half Screen */}
      <div className="flex-1 space-y-4 overflow-auto min-w-0">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Live Traces
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Unmapped traces waiting for session ({unmappedTraces.length})
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {unmappedTraces.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Network />
                  </EmptyMedia>
                  <EmptyTitle>No Unmapped Traces</EmptyTitle>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            unmappedTraces.map((trace) => {
              const isExpanded = expandedTraces.has(trace.queryId);
              const isNew = newTraces.has(trace.queryId);

              return (
                <div
                  key={trace.queryId}
                  className={`overflow-hidden rounded-lg border bg-white transition-all duration-700 hover:shadow-md dark:bg-gray-900 ${
                    isNew
                      ? 'animate-pulse border-blue-400 shadow-lg shadow-blue-200 ring-2 ring-blue-300 dark:border-blue-600 dark:shadow-blue-900/50 dark:ring-blue-700'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTraceExpansion(trace.queryId);
                    }}
                    className="w-full bg-gray-50 px-4 py-3 text-left hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                      )}
                      <Network className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {trace.queryName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(trace.startTime).toLocaleTimeString()} • {trace.spanCount} spans
                        </div>
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                      {trace.spans.map((span, idx) => (
                        <button
                          key={`${span.SpanId}-${idx}`}
                          onClick={() => setSelectedSpan(span)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="Show details">
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-sm text-gray-900 dark:text-gray-100 truncate">
                              {span.SpanName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {span.ServiceName}
                            </div>
                          </div>
                          <Info className="h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
