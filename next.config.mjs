/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    /**
     * Security headers applied to all routes. CSP is now enforced.
     */
  const SUPABASE = 'dmnowaqinfkhovhyztan.supabase.co';
  const GOOGLE_AVATAR = 'lh3.googleusercontent.com';
    const csp = [
      "default-src 'self'",
      // Allow Next inline bootstraps and Stripe SDK; consider replacing 'unsafe-inline' with nonces later
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: js.stripe.com",
      "style-src 'self' 'unsafe-inline' https:",
  // Images from app, Supabase storage/CDN, OpenStreetMap tiles, Google avatars, and general https
  `img-src 'self' data: blob: https: *.tile.openstreetmap.org ${SUPABASE} ${GOOGLE_AVATAR}`,
      "font-src 'self' data: https:",
      // API/fetch and websockets to our origins, Supabase, Stripe, and general https/wss
      `connect-src 'self' https: wss: ${SUPABASE} wss://${SUPABASE} api.stripe.com m.stripe.com`,
      // Stripe embeds/iframes
      "frame-src 'self' https: js.stripe.com checkout.stripe.com",
      "media-src 'self' blob: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https:",
      "manifest-src 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
  images: {
      remotePatterns: [
        { protocol: 'https', hostname: 'dmnowaqinfkhovhyztan.supabase.co' },
        { protocol: 'https', hostname: '**' }
      ],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizeCss: true,
    // Allow native/node packages to be loaded at runtime in server components/routes
    serverComponentsExternalPackages: ['sharp', '@xenova/transformers'],
  },
  webpack: (config) => {
    // Ensure sharp is treated as external (server runtime will resolve it)
    config.externals = config.externals || [];
    config.externals.push({ sharp: 'commonjs sharp' });

    // Add path aliases for @ imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };

    return config;
  },
};
export default nextConfig;
