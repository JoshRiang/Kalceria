import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const nextConfig: NextConfig = {
  turbopack: { root: workspaceRoot },
  images: { 
    formats: ['image/avif', 'image/webp'],
    qualities: [70, 75, 80, 85, 90],
    minimumCacheTTL: 31536000,
  },
  async rewrites() {
    const configuredApi = process.env.API_PROXY_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!configuredApi) return [];

    try {
      const apiUrl = new URL(configuredApi);
      if (!['http:', 'https:'].includes(apiUrl.protocol)) return [];
      const apiPath = apiUrl.pathname.replace(/\/+$/, '') || '/api';
      return [{
        source: '/api/:path*',
        destination: `${apiUrl.origin}${apiPath}/:path*`,
      }];
    } catch {
      return [];
    }
  },
  async headers() {
    return [
      {
        source: '/:all*(mp4|webm|otf|ttf|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:all*(webp|png|jpg|jpeg|gif|svg|ico|avif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ...(process.env.NODE_ENV === 'production'
          ? [
              { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
              {
                key: 'Content-Security-Policy',
                value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' wss:; media-src 'self' blob: https:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
              },
            ]
          : []),
      ],
    }];
  },
};

export default nextConfig;
