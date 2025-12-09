interface SpanAttribute {
  Key: string;
  Value: {
    StringValue?: string;
    IntValue?: string;
    DoubleValue?: number;
    BoolValue?: boolean;
  };
}

interface Span {
  Timestamp: string;
  TraceId: string;
  SpanId: string;
  ParentSpanId: string;
  TraceState: string;
  SpanName: string;
  SpanKind: string;
  ServiceName: string;
  ResourceAttributes: SpanAttribute[];
  ScopeName: string;
  ScopeVersion: string;
  SpanAttributes: SpanAttribute[];
  Duration: string;
  StatusCode: string;
  StatusMessage: string;
  Events: {
    Timestamp: string;
    Name: string;
    Attributes: SpanAttribute[];
  }[];
  Links: {
    TraceId: string;
    SpanId: string;
    TraceState: string;
    Attributes: SpanAttribute[];
  }[];
}

interface SpanWithChildren extends Span {
  children: SpanWithChildren[];
}

interface Session {
  sessionId: string;
  queries: QueryNode[];
  startTime: string;
  endTime: string;
  spanCount: number;
}

interface QueryNode {
  queryId: string;
  queryName: string;
  spans: SpanWithChildren[];
  startTime: string;
  endTime: string;
  spanCount: number;
}

function getAttributeValue(
  attributes: SpanAttribute[] | Record<string, unknown>,
  key: string,
): string | undefined {
  // Handle if attributes is an object/map instead of array
  if (!Array.isArray(attributes)) {
    if (typeof attributes === 'object' && attributes !== null) {
      const value = attributes[key];
      if (value !== undefined) {
        return String(value);
      }
    }
    return undefined;
  }

  // Handle if attributes is an array
  const attr = attributes.find(a => a.Key === key);
  if (!attr) return undefined;

  const value = attr.Value;
  if (value.StringValue) return value.StringValue;
  if (value.IntValue) return value.IntValue;
  if (value.DoubleValue !== undefined) return String(value.DoubleValue);
  if (value.BoolValue !== undefined) return String(value.BoolValue);

  return undefined;
}

function buildSpanHierarchy(spans: Span[]): SpanWithChildren[] {
  const spanMap = new Map<string, SpanWithChildren>();
  const roots: SpanWithChildren[] = [];

  spans.forEach(span => {
    spanMap.set(span.SpanId, { ...span, children: [] });
  });

  spans.forEach(span => {
    const spanWithChildren = spanMap.get(span.SpanId)!;

    if (!span.ParentSpanId || span.ParentSpanId === '') {
      roots.push(spanWithChildren);
    } else {
      const parent = spanMap.get(span.ParentSpanId);
      if (parent) {
        parent.children.push(spanWithChildren);
      } else {
        roots.push(spanWithChildren);
      }
    }
  });

  return roots;
}

function groupBySession(spans: Span[]): Session[] {

  // First pass: build maps for span lookup and session tracking
  const spanBySpanId = new Map<string, Span>();
  const traceSessionMap = new Map<string, string>();

  spans.forEach(span => {
    // Build span lookup map
    spanBySpanId.set(span.SpanId, span);

    // Track which traces have session.id
    const sessionIdFromAttr = getAttributeValue(
      span.SpanAttributes,
      'session.id',
    );
    if (sessionIdFromAttr) {
      traceSessionMap.set(span.TraceId, sessionIdFromAttr);
    }
  });

  // Second pass: propagate session IDs across trace boundaries by following parent links
  spans.forEach(span => {
    if (!traceSessionMap.has(span.TraceId) && span.ParentSpanId) {
      // This trace doesn't have a session, but this span has a parent
      // Look up the parent span (might be in a different trace)
      const parentSpan = spanBySpanId.get(span.ParentSpanId);
      if (parentSpan && traceSessionMap.has(parentSpan.TraceId)) {
        // Parent's trace has a session - inherit it
        traceSessionMap.set(span.TraceId, traceSessionMap.get(parentSpan.TraceId)!);
      }
    }
  });

  // Third pass: group spans by session and query
  const sessionMap = new Map<string, Map<string, Span[]>>();
  const sessionIds = new Set<string>();

  spans.forEach(span => {
    // Get session ID from this span's attributes OR from its trace's root span
    let sessionId = getAttributeValue(span.SpanAttributes, 'session.id');

    // If this span doesn't have session.id, inherit it from the trace mapping
    if (!sessionId) {
      sessionId = traceSessionMap.get(span.TraceId) || 'unknown';
    }

    sessionIds.add(sessionId);

    // Use TraceId as the query ID - this groups all spans from the same trace together
    // All spans within a query execution share the same TraceId
    const queryId = span.TraceId;

    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, new Map<string, Span[]>());
    }

    const queryMap = sessionMap.get(sessionId)!;
    if (!queryMap.has(queryId)) {
      queryMap.set(queryId, []);
    }

    queryMap.get(queryId)!.push(span);
  });

  const sessions: Session[] = [];

  sessionMap.forEach((queryMap, sessionId) => {
    const queries: QueryNode[] = [];
    let sessionStartTime = '';
    let sessionEndTime = '';

    queryMap.forEach((querySpans, queryId) => {
      const hierarchy = buildSpanHierarchy(querySpans);

      const queryStartTime = querySpans.reduce(
        (min, span) => (!min || span.Timestamp < min ? span.Timestamp : min),
        '',
      );
      const queryEndTime = querySpans.reduce(
        (max, span) => (!max || span.Timestamp > max ? span.Timestamp : max),
        '',
      );

      // Find the query name from the root span
      let queryName = 'Unknown Query';

      // Look for the root span (span with no parent or empty parent)
      const rootSpan = querySpans.find(
        s => !s.ParentSpanId || s.ParentSpanId === '',
      );

      if (rootSpan) {
        // If root span name starts with "query.", extract the query ID from it
        if (rootSpan.SpanName.startsWith('query.')) {
          queryName = rootSpan.SpanName.substring(6); // Remove "query." prefix
        } else {
          queryName = rootSpan.SpanName;
        }
      }

      queries.push({
        queryId,
        queryName,
        spans: hierarchy,
        startTime: queryStartTime,
        endTime: queryEndTime,
        spanCount: querySpans.length,
      });

      if (!sessionStartTime || queryStartTime < sessionStartTime) {
        sessionStartTime = queryStartTime;
      }
      if (!sessionEndTime || queryEndTime > sessionEndTime) {
        sessionEndTime = queryEndTime;
      }
    });

    queries.sort((a, b) => a.startTime.localeCompare(b.startTime));

    sessions.push({
      sessionId,
      queries,
      startTime: sessionStartTime,
      endTime: sessionEndTime,
      spanCount: queries.reduce((sum, q) => sum + q.spanCount, 0),
    });
  });

  sessions.sort((a, b) => b.startTime.localeCompare(a.startTime));

  return sessions;
}

async function fetchSpans(limit: number = 200): Promise<Span[]> {
  const clickhouseUrl =
    process.env.CLICKHOUSE_URL ||
    'http://clickhouse-svc.clickhouse.svc.cluster.local:8123';
  const username = process.env.CLICKHOUSE_USERNAME || 'default';
  const password = process.env.CLICKHOUSE_PASSWORD || 'clickhouse';

  const query = `
    SELECT *
    FROM otel.otel_traces
    ORDER BY Timestamp DESC
    LIMIT ${limit}
    FORMAT JSON
  `;

  try {
    const response = await fetch(
      `${clickhouseUrl}/?user=${username}&password=${password}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: query,
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new Error(`ClickHouse query failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Failed to fetch spans:', error);
    return [];
  }
}

export const sessionsService = {
  async getSessions(
    limit: number = 200,
  ): Promise<{ sessions: Session[]; unmappedTraces: QueryNode[] }> {
    try {
      const spans = await fetchSpans(limit);
      const sessions = groupBySession(spans);

      // Find unmapped traces (queries from "unknown" session grouped by TraceId)
      const unknownSessionIndex = sessions.findIndex(s => s.sessionId === 'unknown');

      if (unknownSessionIndex >= 0) {
        const unknownSession = sessions[unknownSessionIndex];

        // Return queries as unmapped traces (each query represents a TraceId group)
        const unmappedTraces = unknownSession.queries;

        console.log('Total unmapped traces:', unmappedTraces.length);

        // Remove the "unknown" session from the sessions list
        sessions.splice(unknownSessionIndex, 1);

        return { sessions, unmappedTraces };
      }

      console.log('No unmapped traces');

      return { sessions, unmappedTraces: [] };
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      return { sessions: [], unmappedTraces: [] };
    }
  },
};


export type { Session, QueryNode, SpanWithChildren, Span };
