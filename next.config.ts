// next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    proxyClientMaxBodySize: '100mb',
  },

  // Move serverComponentsExternalPackages out of experimental
  serverExternalPackages: ['@prisma/client'],

  // Turbopack config for module resolution
  turbopack: {
    resolveAlias: {
      '#lodash': 'lodash-es',
    },
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  // Optimize images for production - use remotePatterns instead of domains
  images: {
    remotePatterns: [
      {
        protocol: 'http',
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

  webpack: (config: { resolve: { alias: any; fallback: any; }; }, { isServer }: any) => {
    // Fix for Speckle packages using #lodash subpath imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '#lodash': 'lodash-es',
    };

    // Handle web-ifc and other BIM libraries
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },

  // Environment variables for client-side
  env: {
    NEXT_PUBLIC_SPECKLE_SERVER_URL: process.env.NEXT_PUBLIC_SPECKLE_SERVER_URL,
    NEXT_PUBLIC_SPECKLE_TOKEN: process.env.NEXT_PUBLIC_SPECKLE_TOKEN,
    NEXT_PUBLIC_AUTODESK_CLIENT_ID: process.env.NEXT_PUBLIC_AUTODESK_CLIENT_ID,
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
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
