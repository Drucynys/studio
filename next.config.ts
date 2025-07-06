// File: next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Updated syntax for external packages
  serverExternalPackages: ['sharp', 'onnxruntime-node'],
  
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
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude 'async_hooks' from client-side bundle to fix build error
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
      };
    }
    return config;
  },

};

export default nextConfig;
