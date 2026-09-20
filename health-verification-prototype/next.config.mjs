/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  experimental: {
    serverActions: { bodySizeLimit: '8mb' },
    serverComponentsExternalPackages: ['pdf-parse', '@napi-rs/canvas', 'tesseract.js']
  }
};
export default nextConfig;
