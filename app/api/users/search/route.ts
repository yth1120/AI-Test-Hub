/**
 * 用户搜索（加成员时按邮箱/姓名找人）
 *
 * GET /api/users/search?q=keyword
 * 登录即可调用，但只返回安全字段（id/name/email），不暴露密码等。
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) {
    return NextResponse.json([]);
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, email: true },
    take: 10,
    orderBy: { email: 'asc' },
  });

  return NextResponse.json(users);
}
