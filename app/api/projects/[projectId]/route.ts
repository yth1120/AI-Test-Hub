/**
 * 单个项目 CRUD
 *
 * GET    /api/projects/:projectId  — 查看项目详情
 * PATCH  /api/projects/:projectId  — 更新项目（ADMIN/PM）
 * DELETE /api/projects/:projectId  — 删除项目（仅 ADMIN）
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';

interface RouteParams {
  params: { projectId: string };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, [
    'ADMIN', 'PM', 'QA', 'DEV', 'VIEWER',
  ]);
  if (!auth) {
    return NextResponse.json({ message: '无权访问该项目' }, { status: 403 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      _count: {
        select: {
          requirements: true,
          testCases: true,
          testScripts: true,
          defects: true,
        },
      },
      memberships: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ message: '项目不存在' }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, ['ADMIN', 'PM']);
  if (!auth) {
    return NextResponse.json({ message: '无权修改该项目' }, { status: 403 });
  }

  const { name, description, status } = await request.json();

  const project = await prisma.project.update({
    where: { id: params.projectId },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
    },
  });

  return NextResponse.json(project);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, ['ADMIN']);
  if (!auth) {
    return NextResponse.json({ message: '仅项目管理员可删除项目' }, { status: 403 });
  }

  await prisma.project.delete({ where: { id: params.projectId } });

  return NextResponse.json({ message: '项目已删除' });
}
