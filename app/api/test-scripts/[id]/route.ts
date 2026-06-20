/**
 * 单个测试脚本 CRUD
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';

interface RouteParams {
  params: { id: string };
}

async function getAuth(scriptId: string, roles: string[]) {
  const s = await prisma.testScript.findUnique({
    where: { id: scriptId },
    select: { projectId: true },
  });
  if (!s) return null;
  return requireProjectRole(s.projectId, roles);
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM', 'QA', 'DEV', 'VIEWER']);
  if (!auth) return NextResponse.json({ message: '脚本不存在或无权访问' }, { status: 404 });
  const script = await prisma.testScript.findUnique({ where: { id: params.id } });
  return NextResponse.json(script);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM', 'QA', 'DEV']);
  if (!auth) return NextResponse.json({ message: '无权修改该脚本' }, { status: 403 });

  const body = await request.json();
  const { title, description, code, language, filePath, requirementId, testCaseId } = body;

  const updated = await prisma.testScript.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(code !== undefined && { code }),
      ...(language !== undefined && { language }),
      ...(filePath !== undefined && { filePath }),
      ...(requirementId !== undefined && { requirementId }),
      ...(testCaseId !== undefined && { testCaseId }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM']);
  if (!auth) return NextResponse.json({ message: '无权删除该脚本' }, { status: 403 });
  await prisma.testScript.delete({ where: { id: params.id } });
  return NextResponse.json({ message: '脚本已删除' });
}
