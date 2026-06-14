import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  async rewrites() {
    return [
      {
        // Intercepta qualquer requisição de áudio com o subdomínio dinâmico
        source: '/api/audio/:cdn_host/:path*',
        // Redireciona para a CDN original correta
        destination: 'https://:cdn_host.jw-cdn.org/:path*',
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
