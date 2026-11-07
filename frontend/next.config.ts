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
    const configuredApi = process.env.API_PROXY_URL || process.env.NEXT_PUBLIC_API_URL || 'https://kalceria-backend.vercel.app/api';
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
        source: '/vid_login1.mp4',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/vid_login2.mp4',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/vid_login3.mp4',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/:all*(webp|png|jpg|jpeg|gif|svg|ico|avif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/BG_IMPROVE_FOR_MAP/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/BG_PersonalChat.webp',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/Subtitute_NeedOurHelp.webp',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ...(process.env.NODE_ENV === 'production'
          ? [
              { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
              {
                key: 'Content-Security-Policy',
                value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' data: blob: https: wss:; media-src 'self' data: blob: https:; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
              },
            ]
          : []),
      ],
    }];
  },
};

export default nextConfig;
