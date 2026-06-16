/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // jspdf uses canvas optionally for image rendering; we don't need it
    config.resolve.fallback = { ...config.resolve.fallback, canvas: false }
    return config
  },
}

module.exports = nextConfig
