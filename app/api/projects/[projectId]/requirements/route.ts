/**
 * 项目需求列表 / 创建
 *
 * GET  /api/projects/:projectId/requirements
 * POST /api/projects/:projectId/requirements
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';
import { auditLog } from '@/../lib/audit';

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

  const requirements = await prisma.requirement.findMany({
    where: { projectId: params.projectId },
    include: {
      _count: {
        select: { testCases: true },
      },
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(requirements);
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, [
    'ADMIN', 'PM', 'QA',
  ]);
  if (!auth) {
    return NextResponse.json({ message: '无权创建需求' }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, priority, parentId } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ message: '需求标题不能为空' }, { status: 400 });
  }

  const requirement = await prisma.requirement.create({
    data: {
      title: title.trim(),
      description: description || null,
      priority: priority || 'MEDIUM',
      author: auth.session.user.name || auth.session.user.email,
      projectId: params.projectId,
      ...(parentId && { parentId }),
    },
  });

  // 审计日志
  await auditLog('CREATE', 'Requirement', requirement.id, requirement.title, null, requirement, auth.session.user.id, params.projectId);

  return NextResponse.json(requirement, { status: 201 });
}
