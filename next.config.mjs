/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
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
