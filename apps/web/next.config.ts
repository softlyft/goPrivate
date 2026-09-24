import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSecurityHeaders } from './src/utils/csp.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');
const isDevelopment = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  // Standalone is for Docker only — Vercel prebuilt breaks with it
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' as const } : {}),
  // Trace imports from the monorepo root (workspace packages + hoisted deps)
  outputFileTracingRoot: repoRoot,
  transpilePackages: ['@goprivate/protocol', '@goprivate/crypto', '@goprivate/sdk'],
  turbopack: {
    root: repoRoot,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: getSecurityHeaders(isDevelopment),
      },
    ];
  },
};

export default nextConfig;
