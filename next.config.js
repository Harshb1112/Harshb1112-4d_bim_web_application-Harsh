const CopyPlugin = require('copy-webpack-plugin')
const path = require('path')

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
  // Headers for WASM files
  async headers() {
    return [
      {
        source: '/wasm/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ]
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
      
      // Copy web-ifc WASM files to public folder
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: path.join(__dirname, 'node_modules/web-ifc'),
              to: path.join(__dirname, 'public/wasm'),
              filter: (resourcePath) => resourcePath.endsWith('.wasm'),
            },
          ],
        })
      )
    }
    
    // Enable WASM support for web-ifc
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }
    
    // Handle WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    })
    
    return config
  },
};

module.exports = nextConfig;
