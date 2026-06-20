/**
 * 项目缺陷列表 / 创建
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

  const defects = await prisma.defect.findMany({
    where: { projectId: params.projectId },
    include: {
      testCase: { select: { id: true, title: true } },
    },
    orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(defects);
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, [
    'ADMIN', 'PM', 'QA', 'DEV',
  ]);
  if (!auth) {
    return NextResponse.json({ message: '无权创建缺陷' }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, steps, severity, priority, type, testCaseId, requirementId, environment } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ message: '缺陷标题不能为空' }, { status: 400 });
  }

  const defect = await prisma.defect.create({
    data: {
      title: title.trim(),
      description: description || null,
      steps: steps || null,
      severity: severity || 'MEDIUM',
      priority: priority || 'MEDIUM',
      type: type || 'BUG',
      reporter: auth.session.user.name || auth.session.user.email,
      projectId: params.projectId,
      ...(testCaseId && { testCaseId }),
      ...(requirementId && { requirementId }),
      ...(environment && { environment }),
    },
  });

  return NextResponse.json(defect, { status: 201 });
}
