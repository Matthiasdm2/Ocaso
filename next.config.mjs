/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
      domains: [
        "dmnowaqinfkhovhyztan.supabase.co",
        // ...andere domeinen
      ],
      remotePatterns: [
        { protocol: 'https', hostname: '**' }
      ]
  }
};
export default nextConfig;
