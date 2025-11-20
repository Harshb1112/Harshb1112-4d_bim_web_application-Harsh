// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    swcPlugins: [
      ["@next/swc-wasm-nodejs", {}],
    ],
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
