/**
 * Catch-all API route for proxying requests to backend services.
 * Runs in Node.js runtime (not Edge Runtime) for full DNS support.
 */
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import http from 'http';

import { COOKIE_SESSION_TOKEN } from '@/lib/constants/auth';
import { env } from '@/lib/config/env';

export const runtime = 'nodejs';

function httpRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; body: string; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port ? parseInt(urlObj.port, 10) : 80,
      path: urlObj.pathname + urlObj.search,
      method,
      headers,
      timeout: 5000,
    };
    
    console.log(`[httpRequest] Connecting to ${options.hostname}:${options.port}${options.path}`);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        const responseHeaders: Record<string, string> = {};
        Object.keys(res.headers).forEach((key) => {
          const value = res.headers[key];
          if (value) {
            responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
          }
        });
        resolve({
          status: res.statusCode || 500,
          body: data,
          headers: responseHeaders,
        });
      });
    });

    req.on('error', (err) => {
      console.error(`[httpRequest] Connection error to ${options.hostname}:${options.port}:`, {
        message: err.message,
        code: (err as NodeJS.ErrnoException).code,
        errno: (err as NodeJS.ErrnoException).errno,
        syscall: (err as NodeJS.ErrnoException).syscall,
        address: (err as NodeJS.ErrnoException).address,
      });
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function handleRequest(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
) {
  let resolvedParams: { path: string[] } | null = null;
  try {
    console.log(`[handleRequest] Starting for ${request.method} ${request.nextUrl.pathname}`);
    
    try {
      resolvedParams = await params;
      console.log(`[handleRequest] Resolved params:`, resolvedParams.path);
    } catch (paramsError) {
      console.error('[handleRequest] Error resolving params:', {
        error: paramsError,
        errorType: typeof paramsError,
        errorString: String(paramsError),
        errorJSON: JSON.stringify(paramsError, Object.getOwnPropertyNames(paramsError)),
      });
      throw new Error(`Failed to resolve params: ${String(paramsError)}`);
    }
    
    let token = null;
    try {
      token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
        cookieName: COOKIE_SESSION_TOKEN,
      });
      console.log(`[handleRequest] Token retrieved:`, token ? 'present' : 'absent');
    } catch (tokenError) {
      console.error('[handleRequest] Error getting token:', {
        error: tokenError,
        errorType: typeof tokenError,
        errorString: String(tokenError),
        errorJSON: JSON.stringify(tokenError, Object.getOwnPropertyNames(tokenError)),
      });
      // Don't throw - continue without token
    }
    
    const backendPath = `/${resolvedParams.path.join('/')}${request.nextUrl.search}`;
    const isSessionsEndpoint = resolvedParams.path[0] === 'sessions';
    
    const host = isSessionsEndpoint
      ? env.ARK_SESSIONS_SERVICE_HOST
      : env.ARK_API_SERVICE_HOST;
    const port = isSessionsEndpoint
      ? env.ARK_SESSIONS_SERVICE_PORT
      : env.ARK_API_SERVICE_PORT;

    console.log(`[handleRequest] Environment check:`, {
      isSessionsEndpoint,
      ARK_API_SERVICE_HOST: env.ARK_API_SERVICE_HOST,
      ARK_API_SERVICE_PORT: env.ARK_API_SERVICE_PORT,
      ARK_SESSIONS_SERVICE_HOST: env.ARK_SESSIONS_SERVICE_HOST,
      ARK_SESSIONS_SERVICE_PORT: env.ARK_SESSIONS_SERVICE_PORT,
      resolvedHost: host,
      resolvedPort: port,
      processEnvCheck: {
        ARK_API_SERVICE_HOST: process.env.ARK_API_SERVICE_HOST,
        ARK_API_SERVICE_PORT: process.env.ARK_API_SERVICE_PORT,
      },
    });

    const targetUrl = `http://${host}:${port}${backendPath}`;
    
    console.log(`[handleRequest] Proxying ${request.method} ${request.nextUrl.pathname} -> ${targetUrl}`);

    const headers: Record<string, string> = {
      'X-Forwarded-Prefix': '/api',
      'X-Forwarded-Host': request.headers.get('host') || '',
      'X-Forwarded-Proto': request.nextUrl.protocol.slice(0, -1),
    };

    if (token?.access_token) {
      headers['Authorization'] = `Bearer ${token.access_token}`;
    }

    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    let body: string | undefined = undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        body = await request.text();
      } catch (bodyError) {
        console.error('[handleRequest] Error reading request body:', {
          error: bodyError,
          errorType: typeof bodyError,
          errorString: String(bodyError),
        });
        // Continue without body
      }
    }

    console.log(`[handleRequest] Making HTTP request to ${targetUrl}`);
    const response = await httpRequest(
      request.method,
      targetUrl,
      headers,
      body,
    );

    console.log(`[handleRequest] Success: ${request.method} ${request.nextUrl.pathname} -> ${response.status}`);

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers['content-type'] || 'application/json',
      },
    });
  } catch (error) {
    let aggregateErrors: unknown[] = [];
    if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as { errors: unknown[] }).errors)) {
      aggregateErrors = (error as { errors: unknown[] }).errors;
    }
    
    const errorDetails = {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      raw: error,
      stringified: String(error),
      json: JSON.stringify(error, Object.getOwnPropertyNames(error instanceof Error ? error : Object(error))),
      aggregateErrors: aggregateErrors.length > 0 ? aggregateErrors.map(e => ({
        name: e instanceof Error ? e.name : typeof e,
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      })) : undefined,
    };
    
    console.error('[handleRequest] Error caught:', {
      method: request.method,
      path: request.nextUrl.pathname,
      resolvedParams: resolvedParams,
      ...errorDetails,
    });
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: errorDetails.message || errorDetails.stringified || 'Unknown error',
        path: request.nextUrl.pathname,
        errorType: errorDetails.name,
        aggregateErrors: errorDetails.aggregateErrors,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const pathname = request.nextUrl.pathname;
  console.log(`[API Route GET] ENTRY - ${pathname}`);
  
  try {
    console.log(`[API Route GET] Calling handleRequest for ${pathname}`);
    const response = await handleRequest(request, params);
    console.log(`[API Route GET] SUCCESS - ${pathname} -> ${response.status}`);
    return response;
  } catch (error) {
    let aggregateErrors: unknown[] = [];
    if (error && typeof error === 'object' && 'errors' in error && Array.isArray((error as { errors: unknown[] }).errors)) {
      aggregateErrors = (error as { errors: unknown[] }).errors;
    }
    
    const errorDetails = {
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      raw: error,
      stringified: String(error),
      json: JSON.stringify(error, Object.getOwnPropertyNames(error instanceof Error ? error : Object(error))),
      aggregateErrors: aggregateErrors.length > 0 ? aggregateErrors.map(e => ({
        name: e instanceof Error ? e.name : typeof e,
        message: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      })) : undefined,
    };
    
    console.error('[API Route GET] Error caught in outer handler:', {
      path: pathname,
      ...errorDetails,
    });
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: errorDetails.message || errorDetails.stringified || 'Unknown error',
        path: pathname,
        errorType: errorDetails.name,
        aggregateErrors: errorDetails.aggregateErrors,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  console.log(`[API Route POST] ${request.nextUrl.pathname}`);
  try {
    return await handleRequest(request, params);
  } catch (error) {
    console.error('[API Route POST Error]', {
      path: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  console.log(`[API Route PUT] ${request.nextUrl.pathname}`);
  try {
    return await handleRequest(request, params);
  } catch (error) {
    console.error('[API Route PUT Error]', {
      path: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  console.log(`[API Route DELETE] ${request.nextUrl.pathname}`);
  try {
    return await handleRequest(request, params);
  } catch (error) {
    console.error('[API Route DELETE Error]', {
      path: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  console.log(`[API Route PATCH] ${request.nextUrl.pathname}`);
  try {
    return await handleRequest(request, params);
  } catch (error) {
    console.error('[API Route PATCH Error]', {
      path: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
