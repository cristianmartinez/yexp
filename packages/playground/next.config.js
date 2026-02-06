import nextra from 'nextra';

const withNextra = nextra({
  contentDirBasePath: '/docs',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@yexp/core'],
  experimental: {
    optimizePackageImports: ['@yexp/core'],
  },
  webpack: (config) => {
    // Handle @yexp/core ES modules properly
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

export default withNextra(nextConfig);
