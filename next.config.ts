import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://10.150.132.218:5000/api/:path*',
      },
    ];
  },
  experimental: {
    proxyTimeout: 300000, // 5分钟超时
  },
};

export default nextConfig;
