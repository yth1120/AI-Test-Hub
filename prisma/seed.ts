/**
 * 种子数据脚本
 *
 * 不再创建演示数据。用户通过注册页自行创建账户与项目。
 * 运行：npm run prisma:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('种子数据已移除。请通过注册页（/register）创建用户，登录后创建项目。');
}

main()
  .catch((e) => {
    console.error('Seed 失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
