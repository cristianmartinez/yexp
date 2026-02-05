import nextra from 'nextra';

const withNextra = nextra({
  contentDirBasePath: '/docs',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@jext/core'],
  experimental: {
    optimizePackageImports: ['@jext/core'],
  },
  webpack: (config) => {
    // Handle @jext/core ES modules properly
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

export default withNextra(nextConfig);
