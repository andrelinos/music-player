import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  async rewrites() {
    return [
      {
        // Intercepta qualquer requisição que comece com /api/audio/
        source: '/api/audio/:path*',
        // Redireciona para a CDN original
        destination: 'https://akamd1.jw-cdn.org/:path*',
      },
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Adicione esta parte:
  webpack: (config) => {
    // Diz ao Next.js para "ignorar" a importação do 'react-native-fs'
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    config.resolve.alias["react-native-fs"] = false;

    return config;
  },
};

export default nextConfig;
