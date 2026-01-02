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
  const isDev = process.env.NODE_ENV !== 'production';
    const csp = [
      "default-src 'self'",
      // Allow Next inline bootstraps and Stripe SDK; consider replacing 'unsafe-inline' with nonces later
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: js.stripe.com",
      "style-src 'self' 'unsafe-inline' https:",
  // Images from app, Supabase storage/CDN, OpenStreetMap tiles, Google avatars, and general https
  `img-src 'self' data: blob: https: *.tile.openstreetmap.org ${SUPABASE} ${GOOGLE_AVATAR}`,
      "font-src 'self' data: https:",
      // API/fetch and websockets to our origins, Supabase, Stripe, and general https/wss
      // Allow localhost:8000 for AI classification service in development
      `connect-src 'self' https: wss: ${SUPABASE} wss://${SUPABASE} api.stripe.com m.stripe.com${isDev ? ' http://localhost:8000 http://127.0.0.1:8000 http://192.168.129.106:8000' : ''}`,
      // Stripe embeds/iframes
      "frame-src 'self' https: js.stripe.com checkout.stripe.com",
      "media-src 'self' blob: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https:",
      "manifest-src 'self'",
      "frame-ancestors 'self'",
      // Only upgrade to HTTPS in production, not in development (breaks localhost)
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          // Only add HSTS in production (breaks localhost development)
          ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }]),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Access-Control-Allow-Origin', value: process.env.NODE_ENV === 'production' ? 'https://ocaso.be' : '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
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
    serverComponentsExternalPackages: ['sharp', '@xenova/transformers', 'onnxruntime-node'],
  },
  webpack: (config, { isServer }) => {
    // Ensure sharp is treated as external (server runtime will resolve it)
    config.externals = config.externals || [];
    config.externals.push({ sharp: 'commonjs sharp' });
    
    // Exclude onnxruntime-node and @xenova/transformers from webpack bundling
    // These are native modules that can't be bundled - they'll be loaded at runtime
    config.externals.push({
      'onnxruntime-node': 'commonjs onnxruntime-node',
      '@xenova/transformers': 'commonjs @xenova/transformers',
    });
    
    // Exclude native .node files from webpack processing
    // They're binary files that can't be processed by webpack
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    // Ignore .node files completely - they're only needed at runtime on server
    config.module.rules.push({
      test: /\.node$/,
      use: 'null-loader',
    });
    
    // Also exclude from client-side bundling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'onnxruntime-node': false,
        '@xenova/transformers': false,
      };
    }

    // Add path aliases for @ imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };

    return config;
  },
};
export default nextConfig;
