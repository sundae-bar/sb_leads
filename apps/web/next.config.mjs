/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@agent-starter/types'],
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
};

export default nextConfig;
