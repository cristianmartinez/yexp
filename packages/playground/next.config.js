import nextra from 'nextra';

const withNextra = nextra({
  contentDirBasePath: '/docs',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['yexp'],
  experimental: {
    optimizePackageImports: ['yexp'],
  },
  webpack: (config) => {
    // Handle yexp ES modules properly
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
};

export default withNextra(nextConfig);
