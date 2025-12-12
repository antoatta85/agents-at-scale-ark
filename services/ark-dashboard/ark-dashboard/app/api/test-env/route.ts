import { NextResponse } from 'next/server';
import { env } from '@/lib/config/env';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    viaEnvModule: {
      ARK_API_SERVICE_HOST: env.ARK_API_SERVICE_HOST,
      ARK_API_SERVICE_PORT: env.ARK_API_SERVICE_PORT,
      ARK_SESSIONS_SERVICE_HOST: env.ARK_SESSIONS_SERVICE_HOST,
      ARK_SESSIONS_SERVICE_PORT: env.ARK_SESSIONS_SERVICE_PORT,
    },
    viaProcessEnv: {
      ARK_API_SERVICE_HOST: process.env.ARK_API_SERVICE_HOST || 'NOT SET',
      ARK_API_SERVICE_PORT: process.env.ARK_API_SERVICE_PORT || 'NOT SET',
      ARK_SESSIONS_SERVICE_HOST: process.env.ARK_SESSIONS_SERVICE_HOST || 'NOT SET',
      ARK_SESSIONS_SERVICE_PORT: process.env.ARK_SESSIONS_SERVICE_PORT || 'NOT SET',
    },
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('ARK_') || k.includes('SESSIONS')),
  });
}

