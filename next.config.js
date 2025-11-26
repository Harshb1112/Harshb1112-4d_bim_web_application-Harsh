/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Suppress hydration warnings from Radix UI
  experimental: {
    // no turbo option here — removed from Next.js
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Turbopack configuration for Next.js 16+
  turbopack: {
    resolveAlias: {
      '#lodash': 'lodash-es',
    },
  },
  webpack: (config, { isServer }) => {
    // Fix for Speckle viewer lodash import issue (for webpack builds)
    config.resolve.alias = {
      ...config.resolve.alias,
      '#lodash': 'lodash-es',
    }
    
    // Handle Speckle packages
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    return config
  },
};

module.exports = nextConfig;
