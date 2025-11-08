/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopack: {
      root: __dirname
    }
  },
  reactStrictMode: true,
  eslint: {
    // allow production build even if ESLint errors exist
    ignoreDuringBuilds: true
  }
};

module.exports = nextConfig;
