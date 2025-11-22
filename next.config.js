/** @type {import('next').NextConfig} */
const nextConfig = {
  // Webpack configuration for pdf-parse
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias.canvas = false;
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },

  experimental: {
    serverActions: {
      allowedOrigins: ['*']
    }
  },
  
  // Optimization
  swcMinify: true,
  
  // Disable strict mode temporarily to rule out double-render crashes
  reactStrictMode: false, 

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig;
