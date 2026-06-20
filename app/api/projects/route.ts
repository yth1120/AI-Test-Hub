/**
 * 项目列表 / 创建
 *
 * GET  /api/projects     — 当前用户有成员身份的所有项目
 * POST /api/projects     — 创建项目（创建者自动成为 ADMIN）
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';

export async function GET() {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: {
      memberships: {
        some: { userId: session.user.id },
      },
    },
    include: {
      _count: {
        select: {
          requirements: true,
          testCases: true,
          defects: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }

  const { name, description } = await request.json();

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ message: '项目名称不能为空' }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description || null,
      ownerId: session.user.id,
      memberships: {
        create: {
          userId: session.user.id,
          role: 'ADMIN',
        },
      },
    },
    include: {
      memberships: true,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
