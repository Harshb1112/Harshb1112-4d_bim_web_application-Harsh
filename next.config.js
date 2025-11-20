/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // no turbo option here — removed from Next.js
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
