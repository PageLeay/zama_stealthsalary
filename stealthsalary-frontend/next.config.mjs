/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use static export only for local production builds, not for Vercel
  ...(process.env.NODE_ENV === 'production' && !process.env.VERCEL && { output: 'export' }),
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  experimental: { serverActions: { allowedOrigins: [] } },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/:path*.wasm',
        headers: [
          { key: 'Content-Type', value: 'application/wasm' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

export default nextConfig;
