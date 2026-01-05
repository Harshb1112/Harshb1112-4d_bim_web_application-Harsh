/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for deployment
  output: 'standalone',
  
  // Ignore build errors for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Turbopack configuration (Next.js 16+)
  turbopack: {
    resolveAlias: {
      '#lodash': 'lodash-es',
    },
  },

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },

  // Optimize images for production
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'app.speckle.systems',
      },
      {
        protocol: 'https',
        hostname: 'developer.api.autodesk.com',
      },
    ],
    unoptimized: false,
  },

  // Webpack fallback for compatibility
  webpack: (config, { isServer }) => {
    // Handle web-ifc and other BIM libraries
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Fix for Speckle packages
    config.resolve.alias = {
      ...config.resolve.alias,
      '#lodash': 'lodash-es',
    };

    return config;
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;