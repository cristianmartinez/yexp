/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@expr/core'],
  experimental: {
    optimizePackageImports: ['@expr/core'],
  },
  webpack: (config) => {
    // Handle @expr/core ES modules properly
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

export default nextConfig;
