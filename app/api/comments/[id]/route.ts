/**
 * 单条评论操作
 *
 * DELETE /api/comments/:id — 删除评论
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';

interface RouteParams {
  params: { id: string };
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }

  const comment = await prisma.comment.findUnique({
    where: { id: params.id },
  });

  if (!comment) {
    return NextResponse.json({ message: '评论不存在' }, { status: 404 });
  }

  // 只允许删除自己的评论
  if (comment.userId !== session.user.id) {
    return NextResponse.json({ message: '只能删除自己的评论' }, { status: 403 });
  }

  await prisma.comment.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ message: '评论已删除' });
}
