/**
 * 通知 API（当前登录用户）
 *
 * GET   /api/notifications?unread=1&limit=20  — 当前用户的通知列表
 * PATCH /api/notifications                    — 全部标记已读 Body: { } 或单条 { id }
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
  const unreadOnly = searchParams.get('unread') === '1';
  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

  const where: any = { userId: session.user.id };
  if (unreadOnly) where.read = false;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({ where: { userId: session.user.id, read: false } }),
  ]);

  return NextResponse.json({ items, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  if (body.id) {
    // 单条标记已读（仅限本人）
    await prisma.notification.updateMany({
      where: { id: body.id, userId: session.user.id },
      data: { read: true },
    });
  } else {
    // 全部标记已读
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}
