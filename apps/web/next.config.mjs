/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@scoop/types'],
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
};

export default nextConfig;
