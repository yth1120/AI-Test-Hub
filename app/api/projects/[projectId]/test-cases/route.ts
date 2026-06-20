/**
 * 项目测试用例列表 / 创建
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

  const testCases = await prisma.testCase.findMany({
    where: { projectId: params.projectId },
    include: {
      requirement: { select: { id: true, title: true } },
      _count: { select: { executions: true, defects: true } },
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json(testCases);
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, [
    'ADMIN', 'PM', 'QA',
  ]);
  if (!auth) {
    return NextResponse.json({ message: '无权创建测试用例' }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, steps, expectedResult, priority, category, preconditions, requirementId, testPlanId } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ message: '用例标题不能为空' }, { status: 400 });
  }

  if (!requirementId) {
    return NextResponse.json({ message: '关联需求不能为空' }, { status: 400 });
  }

  const testCase = await prisma.testCase.create({
    data: {
      title: title.trim(),
      description: description || null,
      steps: typeof steps === 'string' ? steps : JSON.stringify(steps || []),
      expectedResult: expectedResult || '',
      priority: priority || 'MEDIUM',
      category: category || 'FUNCTIONAL',
      preconditions: preconditions || null,
      author: auth.session.user.name || auth.session.user.email,
      projectId: params.projectId,
      ...(requirementId && { requirementId }),
      ...(testPlanId && { testPlanId }),
    },
  });

  return NextResponse.json(testCase, { status: 201 });
}
