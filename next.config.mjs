/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      { source: '/api/auth/:path*', destination: 'http://localhost:4001/auth/:path*' },
      { source: '/api/auth-cookie/:path*', destination: 'http://localhost:4001/auth/:path*' },
      { source: '/api/core/:path*', destination: 'http://localhost:4002/:path*' },
      { source: '/api/chat/:path*', destination: 'http://localhost:4003/:path*' },
      { source: '/api/voice/:path*', destination: 'http://localhost:4004/:path*' },
      { source: '/api/spaces/:path*', destination: 'http://localhost:4005/:path*' },
    ];
  },
};

export default nextConfig;

