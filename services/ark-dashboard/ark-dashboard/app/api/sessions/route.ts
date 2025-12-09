import { NextResponse } from 'next/server';

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

async function queryClickHouse(limit: number = 200): Promise<Span[]> {
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
      },
    );

    if (!response.ok) {
      throw new Error(`ClickHouse query failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Failed to query ClickHouse:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const spans = await queryClickHouse(limit);

    return NextResponse.json({ spans });
  } catch (error) {
    console.error('Sessions API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch sessions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
