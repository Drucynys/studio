
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pokemontcg.io',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add the Firebase Studio preview origin to allowedDevOrigins
  allowedDevOrigins: [
 'https://6000-firebase-studio-1749140756123.cluster-ombtxv25tbd6yrjpp3lukp6zhc.cloudworkstations.dev',
 'https://9003-firebase-studio-1749140756123.cluster-ombtxv25tbd6yrjpp3lukp6zhc.cloudworkstations.dev'
 ],
};

export default nextConfig;
