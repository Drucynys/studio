// File: next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Updated syntax for external packages
  serverExternalPackages: ['sharp', 'onnxruntime-node'],
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
    ],
  },

  
  // Allow your Cloud Workstation domain
  allowedDevOrigins: [
    '3000-firebase-studio-1749140756123.cluster-ombtxv25tbd6yrjpp3lukp6zhc.cloudworkstations.dev',
    '3001-firebase-studio-1749140756123.cluster-ombtxv25tbd6yrjpp3lukp6zhc.cloudworkstations.dev',
    '6000-firebase-studio-1749140756123.cluster-ombtxv25tbd6yrjpp3lukp6zhc.cloudworkstations.dev'
  ],
  
  // If you plan to use external images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
      },
      {
        protocol: 'https',
        hostname: 'assets.tcgdx.net',
      },
      {
        protocol: 'https',
        hostname: 'tcgdx.net',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      }
    ],
    formats: ['image/avif', 'image/webp'], // Modern formats for better compression
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Exclude 'async_hooks' from client-side bundle to fix build error
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
      };
    }

    // Optimize bundle splitting for better caching and loading
    if (!dev) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: -10,
          },
          firebase: {
            test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
            name: 'firebase',
            chunks: 'all',
            priority: 10,
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 5,
          },
          icons: {
            test: /[\\/]node_modules[\\/](lucide-react|@radix-ui\/react-icons)[\\/]/,
            name: 'icons',
            chunks: 'all',
            priority: 5,
          },
        },
      };

      // Tree shaking optimizations
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
    }

    return config;
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Enable gzip compression
  compress: true,

};

export default nextConfig;
