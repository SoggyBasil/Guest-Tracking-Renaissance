/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // HTTPS configuration for production
  server: {
    https: {
      key: process.env.SSL_KEY_PATH || './private.key',
      cert: process.env.SSL_CERT_PATH || './certificate.crt',
    },
  },
}

export default nextConfig
