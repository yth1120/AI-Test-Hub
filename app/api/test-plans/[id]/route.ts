/**
 * 单个测试计划 CRUD（含审计日志）
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';
import { auditLog } from '@/../lib/audit';

interface RouteParams {
  params: { id: string };
}

async function getAuth(planId: string, roles: string[]) {
  const plan = await prisma.testPlan.findUnique({
    where: { id: planId },
    select: { projectId: true },
  });
  if (!plan) return null;
  return requireProjectRole(plan.projectId, roles);
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM', 'QA', 'DEV', 'VIEWER']);
  if (!auth) {
    return NextResponse.json({ message: '计划不存在或无权访问' }, { status: 404 });
  }

  const plan = await prisma.testPlan.findUnique({
    where: { id: params.id },
    include: {
      requirements: {
        include: {
          requirement: { select: { id: true, title: true, status: true, priority: true } },
        },
      },
      testCases: { select: { id: true, title: true, status: true } },
    },
  });

  return NextResponse.json(plan);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM', 'QA']);
  if (!auth) {
    return NextResponse.json({ message: '无权修改该计划' }, { status: 403 });
  }

  const old = await prisma.testPlan.findUnique({ where: { id: params.id } });
  if (!old) return NextResponse.json({ message: '计划不存在' }, { status: 404 });

  const body = await request.json();
  const {
    title, description, strategy, scope, risks, resources,
    startDate, endDate, status,
  } = body;

  const updated = await prisma.testPlan.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(strategy !== undefined && { strategy }),
      ...(scope !== undefined && { scope }),
      ...(risks !== undefined && { risks }),
      ...(resources !== undefined && { resources }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(status !== undefined && { status }),
    },
  });

  await auditLog('UPDATE', 'TestPlan', updated.id, updated.title, old, updated, auth.session.user.id, old.projectId);

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM']);
  if (!auth) {
    return NextResponse.json({ message: '无权删除该计划' }, { status: 403 });
  }

  const old = await prisma.testPlan.findUnique({ where: { id: params.id } });
  if (!old) return NextResponse.json({ message: '计划不存在' }, { status: 404 });

  await prisma.testPlan.delete({ where: { id: params.id } });

  await auditLog('DELETE', 'TestPlan', old.id, old.title, old, null, auth.session.user.id, old.projectId);

  return NextResponse.json({ message: '测试计划已删除' });
}
