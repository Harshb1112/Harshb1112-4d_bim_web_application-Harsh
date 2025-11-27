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
    serverActions: {
      bodySizeLimit: '100mb',
    },
    middlewareClientMaxBodySize: '100mb',
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: false,
  },

  // File upload configuration
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
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
