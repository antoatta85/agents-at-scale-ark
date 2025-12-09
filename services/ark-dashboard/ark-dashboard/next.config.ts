import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: process.env.ARK_DASHBOARD_BASE_PATH || '',
  assetPrefix: process.env.ARK_DASHBOARD_ASSET_PREFIX || '',
  experimental: {
    serverActions: {
      allowedOrigins: [
        'dashboard.127.0.0.1.nip.io:8080',
        '127.0.0.1.nip.io:8080',
        'localhost:3000',
      ],
    },
  },
};

export default nextConfig;
