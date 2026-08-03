import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@goprivate/protocol', '@goprivate/crypto', '@goprivate/sdk'],
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
};

export default nextConfig;
