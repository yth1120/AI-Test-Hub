/**
 * Prisma 客户端单例
 *
 * Next.js 热重载会创建多个 PrismaClient 实例，导致数据库连接泄漏。
 * 使用 globalThis 缓存实例避免此问题。
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
