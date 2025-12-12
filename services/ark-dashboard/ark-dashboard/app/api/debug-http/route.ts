/**
 * Debug endpoint to test http requests
 */
import { NextResponse } from 'next/server';
import http from 'http';

export const runtime = 'nodejs';

export async function GET() {
  return new Promise<NextResponse>((resolve) => {
    const options = {
      hostname: 'ark-api.default.svc.cluster.local',
      port: 8000,
      path: '/v1/sessions',
      method: 'GET',
      timeout: 2000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk.toString();
      });
      res.on('end', () => {
        resolve(NextResponse.json({
          success: true,
          status: res.statusCode,
          data: data.substring(0, 100),
        }));
      });
    });

    req.on('error', (err) => {
      resolve(NextResponse.json({
        success: false,
        error: err.message,
        name: err.name,
      }, { status: 500 }));
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(NextResponse.json({
        success: false,
        error: 'Timeout',
      }, { status: 500 }));
    });

    req.end();
  });
}

