/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sundae/types'],
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
};

export default nextConfig;
