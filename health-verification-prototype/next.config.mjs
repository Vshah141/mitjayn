/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  experimental: { serverActions: { bodySizeLimit: '8mb' } }
};
export default nextConfig;
