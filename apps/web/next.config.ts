import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@tickcap/core', '@tickcap/tokens'],
}

export default nextConfig
