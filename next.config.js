/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@modelcontextprotocol/sdk'],
};

module.exports = nextConfig;
