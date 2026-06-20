/**
 * 单个测试用例 CRUD
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';

interface RouteParams {
  params: { id: string };
}

async function getAuth(tcId: string, roles: string[]) {
  const tc = await prisma.testCase.findUnique({
    where: { id: tcId },
    select: { projectId: true },
  });
  if (!tc) return null;
  return requireProjectRole(tc.projectId, roles);
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM', 'QA', 'DEV', 'VIEWER']);
  if (!auth) {
    return NextResponse.json({ message: '用例不存在或无权访问' }, { status: 404 });
  }

  const testCase = await prisma.testCase.findUnique({
    where: { id: params.id },
    include: {
      requirement: true,
      executions: true,
      defects: true,
      testPoint: true,
    },
  });

  return NextResponse.json(testCase);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM', 'QA']);
  if (!auth) {
    return NextResponse.json({ message: '无权修改该用例' }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, steps, expectedResult, status, priority, category, preconditions } = body;

  const updated = await prisma.testCase.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(steps !== undefined && { steps: typeof steps === 'string' ? steps : JSON.stringify(steps) }),
      ...(expectedResult !== undefined && { expectedResult }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(category !== undefined && { category }),
      ...(preconditions !== undefined && { preconditions }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM']);
  if (!auth) {
    return NextResponse.json({ message: '无权删除该用例' }, { status: 403 });
  }

  await prisma.testCase.delete({ where: { id: params.id } });
  return NextResponse.json({ message: '测试用例已删除' });
}
