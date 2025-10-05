/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
      domains: [
        "dmnowaqinfkhovhyztan.supabase.co",
        // ...andere domeinen
      ],
      remotePatterns: [
        { protocol: 'https', hostname: '**' }
      ],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizeCss: true,
  },
};
export default nextConfig;
