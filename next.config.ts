import type { NextConfig } from "next";

const nextConfig = {
  // 2. Remote Image Whitelisting (Fixes the Cloudinary Error)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  // 3. Security Headers (Fixes the Embedding/Iframe Issue)
  async headers() {
    return [
      {
        source: '/dashboard',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' http://localhost:3000 http://localhost:3001 https://taskflow-project-five-gamma.vercel.app https://taskflow-demo-v2.vercel.app/ https://taskflow-crm.vercel.app/ https://taskflow.devtech-erp-solutions.cloud/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
