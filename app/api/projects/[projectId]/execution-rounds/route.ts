/**
 * 测试执行轮次 API
 *
 * GET  /api/projects/:projectId/execution-rounds     — 轮次列表
 * POST /api/projects/:projectId/execution-rounds     — 创建轮次
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

  const rounds = await prisma.testExecutionRound.findMany({
    where: { projectId: params.projectId },
    include: {
      executions: {
        select: { id: true, status: true },
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  // 计算每轮的通过率汇总
  const result = rounds.map((round) => {
    const total = round.executions.length;
    const passed = round.executions.filter((e) => e.status === 'PASS').length;
    const failed = round.executions.filter((e) => e.status === 'FAIL').length;
    return {
      ...round,
      totalExecutions: total,
      passCount: passed,
      failCount: failed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, ['ADMIN', 'PM', 'QA']);
  if (!auth) {
    return NextResponse.json({ message: '无权创建执行轮次' }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, testPlanId, testCaseIds } = body;

  if (!name || !testCaseIds?.length) {
    return NextResponse.json({ message: '轮次名称和用例列表不能为空' }, { status: 400 });
  }

  const round = await prisma.testExecutionRound.create({
    data: {
      name,
      description: description || null,
      testPlanId: testPlanId || null,
      projectId: params.projectId,
      executions: {
        create: testCaseIds.map((tcId: string) => ({
          testCaseId: tcId,
          status: 'PENDING',
        })),
      },
    },
    include: {
      executions: true,
    },
  });

  return NextResponse.json(round, { status: 201 });
}
