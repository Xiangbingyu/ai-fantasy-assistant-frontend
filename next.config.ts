import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
  experimental: {
    proxyTimeout: 300000, // 5分钟超时
  },
};

export default nextConfig;
