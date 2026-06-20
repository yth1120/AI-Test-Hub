/**
 * 单个需求 CRUD（含审计日志）
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';
import { auditLog } from '@/../lib/audit';

interface RouteParams {
  params: { id: string };
}

async function getAuth(requirementId: string, roles: string[]) {
  const req = await prisma.requirement.findUnique({
    where: { id: requirementId },
    select: { projectId: true },
  });
  if (!req) return null;
  return requireProjectRole(req.projectId, roles);
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM', 'QA', 'DEV', 'VIEWER']);
  if (!auth) {
    return NextResponse.json({ message: '需求不存在或无权访问' }, { status: 404 });
  }

  const requirement = await prisma.requirement.findUnique({
    where: { id: params.id },
    include: {
      testCases: true,
      testPoints: true,
      diagnosticReports: true,
      children: true,
    },
  });

  return NextResponse.json(requirement);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM', 'QA']);
  if (!auth) {
    return NextResponse.json({ message: '无权修改该需求' }, { status: 403 });
  }

  // 获取旧数据用于审计
  const old = await prisma.requirement.findUnique({ where: { id: params.id } });
  if (!old) return NextResponse.json({ message: '需求不存在' }, { status: 404 });

  const body = await request.json();
  const { title, description, status, priority, testCoverage, parentId } = body;

  const updated = await prisma.requirement.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(testCoverage !== undefined && { testCoverage }),
      ...(parentId !== undefined && { parentId }),
    },
  });

  // 审计日志
  await auditLog('UPDATE', 'Requirement', updated.id, updated.title, old, updated, auth.session.user.id, old.projectId);

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM']);
  if (!auth) {
    return NextResponse.json({ message: '无权删除该需求' }, { status: 403 });
  }

  const old = await prisma.requirement.findUnique({ where: { id: params.id } });
  if (!old) return NextResponse.json({ message: '需求不存在' }, { status: 404 });

  await prisma.requirement.delete({ where: { id: params.id } });

  // 审计日志
  await auditLog('DELETE', 'Requirement', old.id, old.title, old, null, auth.session.user.id, old.projectId);

  return NextResponse.json({ message: '需求已删除' });
}
