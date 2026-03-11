import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    turbopack: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
} as NextConfig; // <-- type assertion to avoid error

module.exports = {
  async headers() {
    return [
      {
        source: '/dashboard', // The page you are embedding
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' http://localhost:3000 https://taskflow-project-five-gamma.vercel.app",
          },
        ],
      },
    ]
  },
}

export default nextConfig;
