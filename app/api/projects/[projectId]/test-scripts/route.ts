/**
 * 项目测试脚本列表 / 创建
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

  const scripts = await prisma.testScript.findMany({
    where: { projectId: params.projectId },
    include: { testCase: { select: { id: true, title: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(scripts);
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, [
    'ADMIN', 'PM', 'QA', 'DEV',
  ]);
  if (!auth) {
    return NextResponse.json({ message: '无权创建脚本' }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, code, language, filePath, requirementId, testCaseId } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ message: '脚本标题不能为空' }, { status: 400 });
  }

  const script = await prisma.testScript.create({
    data: {
      title: title.trim(),
      description: description || null,
      code: code || '',
      language: language || 'PYTHON',
      filePath: filePath || null,
      requirementId: requirementId || null,
      testCaseId: testCaseId || null,
      projectId: params.projectId,
    },
  });

  return NextResponse.json(script, { status: 201 });
}
