/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 输出模式：standalone 适合容器化部署
  output: 'standalone',

  // 预存在的 lint 错误（旧 Electron 代码）不阻塞构建
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 实验性功能
  experimental: {
    // 服务端组件使用 Prisma 等 Node native 模块
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
};

module.exports = nextConfig;
