import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: process.env.ARK_DASHBOARD_BASE_PATH || '',
  assetPrefix: process.env.ARK_DASHBOARD_ASSET_PREFIX || '',
  // Make environment variables available to Edge Runtime
  env: {
    ARK_API_SERVICE_HOST: process.env.ARK_API_SERVICE_HOST,
    ARK_API_SERVICE_PORT: process.env.ARK_API_SERVICE_PORT,
    ARK_API_SERVICE_PROTOCOL: process.env.ARK_API_SERVICE_PROTOCOL,
    ARK_SESSIONS_SERVICE_HOST: process.env.ARK_SESSIONS_SERVICE_HOST,
    ARK_SESSIONS_SERVICE_PORT: process.env.ARK_SESSIONS_SERVICE_PORT,
    ARK_SESSIONS_SERVICE_PROTOCOL: process.env.ARK_SESSIONS_SERVICE_PROTOCOL,
  },
  // Disable caching in development for better hot reload
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      // Force Turbopack to recompile on file changes
      turbo: {
        resolveAlias: {},
      },
    },
  }),
};

export default nextConfig;
