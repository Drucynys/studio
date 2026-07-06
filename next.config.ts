// File: next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Updated syntax for external packages
  serverExternalPackages: [
    'sharp',
    'onnxruntime-node',
    '@opentelemetry/sdk-node',
    '@opentelemetry/api',
  ],

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
    'localhost:3000',
    '127.0.0.1:3000',
    '192.168.1.241:3000',
    '192.168.1.241',
    '3000-firebase-studio-1749140756123.cluster-ombtxv25tbd6yrjpp3lukp6zhc.cloudworkstations.dev',
    '3001-firebase-studio-1749140756123.cluster-ombtxv25tbd6yrjpp3lukp6zhc.cloudworkstations.dev',
    '6000-firebase-studio-1749140756123.cluster-ombtxv25tbd6yrjpp3lukp6zhc.cloudworkstations.dev',
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
      },
      {
        protocol: 'https',
        hostname: 'images.scrydex.com',
      },
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

    return config;
  },

  // Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  // Enable gzip compression
  compress: true,

  // Silence Turbopack webpack config warning/error
  turbopack: {},
};

export default nextConfig;
