// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    swcPlugins: [
      ["@next/swc-wasm-nodejs", {}],
    ],
    turbo: {
      resolveAlias: {
        '#lodash': 'lodash-es',
      },
    },
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  webpack: (config: { resolve: { alias: any; }; }, { isServer }: any) => {
    // Fix for Speckle packages using #lodash subpath imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '#lodash': 'lodash-es',
    };

    return config;
  },
};

export default nextConfig;
