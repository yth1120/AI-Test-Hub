/**
 * 评论 API
 *
 * GET  /api/comments?targetType=Requirement&targetId=xxx  — 获取评论列表
 * POST /api/comments                                     — 创建评论
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get('targetType');
  const targetId = searchParams.get('targetId');

  if (!targetType || !targetId) {
    return NextResponse.json({ message: '缺少 targetType 或 targetId 参数' }, { status: 400 });
  }

  const comments = await prisma.comment.findMany({
    where: { targetType, targetId, parentId: null },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      replies: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(comments);
}

export async function POST(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }

  const body = await request.json();
  const { content, targetType, targetId, parentId, projectId } = body;

  if (!content || !targetType || !targetId || !projectId) {
    return NextResponse.json({ message: '缺少必填字段' }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      targetType,
      targetId,
      parentId: parentId || null,
      userId: session.user.id,
      projectId,
    },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
