/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip type checking during production builds for faster deploys
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['payrollmanagement.space', '72.60.233.210', 'localhost:3000']
    }
  }
}

module.exports = nextConfig
