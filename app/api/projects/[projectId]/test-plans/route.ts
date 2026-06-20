/**
 * 测试计划 API
 *
 * GET  /api/projects/:projectId/test-plans  — 计划列表（含关联需求/用例计数）
 * POST /api/projects/:projectId/test-plans  — 创建计划（可选 requirementIds 建立关联）
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

  const plans = await prisma.testPlan.findMany({
    where: { projectId: params.projectId },
    include: {
      _count: { select: { testCases: true, requirements: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(plans);
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, ['ADMIN', 'PM', 'QA']);
  if (!auth) {
    return NextResponse.json({ message: '无权创建测试计划' }, { status: 403 });
  }

  const body = await request.json();
  const {
    title, description, strategy, scope, risks, resources,
    startDate, endDate, status, requirementIds,
  } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ message: '计划标题不能为空' }, { status: 400 });
  }

  const plan = await prisma.testPlan.create({
    data: {
      title: title.trim(),
      description: description || null,
      strategy: strategy || null,
      scope: scope || null,
      risks: risks || null,
      resources: resources || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: status || 'PLANNING',
      projectId: params.projectId,
      ...(Array.isArray(requirementIds) && requirementIds.length > 0 && {
        requirements: {
          create: requirementIds.map((reqId: string) => ({ requirementId: reqId })),
        },
      }),
    },
    include: {
      _count: { select: { testCases: true, requirements: true } },
    },
  });

  await auditLog('CREATE', 'TestPlan', plan.id, plan.title, null, plan, auth.session.user.id, params.projectId);

  return NextResponse.json(plan, { status: 201 });
}
