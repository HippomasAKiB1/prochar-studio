/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || "http://localhost:8080";

module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@prochar/shared", "@tanstack/react-query"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  // Same-origin proxy: browser calls /api/* and Next forwards to the API,
  // keeping cookies first-party (SameSite=Lax) and avoiding CORS.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};
