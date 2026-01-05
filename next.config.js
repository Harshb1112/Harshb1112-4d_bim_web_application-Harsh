/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for deployment
  output: 'standalone',
  
  // Ignore build errors for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Experimental features
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },

  // File upload configuration
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },

  // Optimize images for production
  images: {
    domains: ['localhost', 'app.speckle.systems', 'developer.api.autodesk.com'],
    unoptimized: false,
  },

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