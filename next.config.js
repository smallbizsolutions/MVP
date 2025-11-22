/** @type {import('next').NextConfig} */
const nextConfig = {
  // Commented out for Railway deployment - can re-enable after successful deploy
  // output: 'standalone',
  
  // Webpack configuration for pdf-parse
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse requires canvas for server-side
      config.resolve.alias.canvas = false;
    }
    return config;
  },
  
  // Ensure Railway can access the app
  experimental: {
    serverActions: {
      allowedOrigins: ['*']
    }
  }
}

export default nextConfig;
