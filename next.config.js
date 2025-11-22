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
  
  // Security Headers - UPDATED FOR RAILWAY
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              // CRITICAL FIX: Allow Railway domains
              "connect-src 'self' https://*.supabase.co https://*.google.com https://*.googleapis.com https://api.stripe.com https://*.anthropic.com https://*.railway.app https://*.up.railway.app",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'"
              // REMOVED: "upgrade-insecure-requests" - causes issues on Railway
            ].join('; ')
          }
        ],
      },
    ];
  },
  
  // Ensure Railway can access the app
  experimental: {
    serverActions: {
      allowedOrigins: ['*']
    }
  },
  
  // Railway optimization
  swcMinify: true,
  poweredByHeader: false,
  
  // Ignore build errors from type checking
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // CRITICAL: Output standalone for Railway
  output: 'standalone'
}

export default nextConfig;
