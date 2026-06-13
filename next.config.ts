import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Security headers for public-facing deployment
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking - blocks your site from being embedded in cross-origin iframes
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          // Prevent MIME-type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Control referrer information leak
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Prevent XSS in older browsers
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Restrict what browser features can be used
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/(.*\\.wasm)",
        headers: [
          {
            key: "Content-Type",
            value: "application/wasm",
          },
        ],
      },
    ];
  },
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS ? process.env.ALLOWED_DEV_ORIGINS.split(',') : ['localhost'],
  async rewrites() {
    return [
      {
        source: "/apple-touch-icon-precomposed.png",
        destination: "/apple-touch-icon.png?v=2",
      },
      {
        // Serve user-uploaded files through the API route so they work
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
