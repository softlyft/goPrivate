import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');

const nextConfig: NextConfig = {
  // Standalone is for Docker only — Vercel prebuilt breaks with it
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' as const } : {}),
  // Trace imports from the monorepo root (workspace packages + hoisted deps)
  outputFileTracingRoot: repoRoot,
  transpilePackages: ['@goprivate/protocol', '@goprivate/crypto', '@goprivate/sdk'],
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
