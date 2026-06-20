/**
 * 测试计划 ↔ 需求关联管理（多对多 TestPlanRequirement）
 *
 * POST   /api/test-plans/:id/requirements          Body: { requirementId }  — 添加关联
 * DELETE /api/test-plans/:id/requirements?requirementId=xxx                 — 移除关联
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';

interface RouteParams {
  params: { id: string };
}

async function getAuth(planId: string, roles: string[]) {
  const plan = await prisma.testPlan.findUnique({
    where: { id: planId },
    select: { projectId: true },
  });
  if (!plan) return null;
  return { auth: await requireProjectRole(plan.projectId, roles), projectId: plan.projectId };
}

export async function POST(request: Request, { params }: RouteParams) {
  const ctx = await getAuth(params.id, ['ADMIN', 'PM', 'QA']);
  if (!ctx?.auth) {
    return NextResponse.json({ message: '计划不存在或无权修改' }, { status: 403 });
  }

  const { requirementId } = await request.json();
  if (!requirementId) {
    return NextResponse.json({ message: '缺少 requirementId' }, { status: 400 });
  }

  // 校验需求属于同一项目，避免跨项目关联
  const req = await prisma.requirement.findUnique({
    where: { id: requirementId },
    select: { projectId: true },
  });
  if (!req || req.projectId !== ctx.projectId) {
    return NextResponse.json({ message: '需求不存在或不属于该项目' }, { status: 400 });
  }

  // 幂等：已存在则直接返回
  const link = await prisma.testPlanRequirement.upsert({
    where: {
      testPlanId_requirementId: { testPlanId: params.id, requirementId },
    },
    create: { testPlanId: params.id, requirementId },
    update: {},
  });

  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const ctx = await getAuth(params.id, ['ADMIN', 'PM', 'QA']);
  if (!ctx?.auth) {
    return NextResponse.json({ message: '计划不存在或无权修改' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const requirementId = searchParams.get('requirementId');
  if (!requirementId) {
    return NextResponse.json({ message: '缺少 requirementId' }, { status: 400 });
  }

  await prisma.testPlanRequirement.deleteMany({
    where: { testPlanId: params.id, requirementId },
  });

  return NextResponse.json({ message: '关联已移除' });
}
