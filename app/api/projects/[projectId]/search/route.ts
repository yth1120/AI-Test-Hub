/**
 * 全局搜索 API（项目内跨实体）
 *
 * GET /api/projects/:projectId/search?q=关键字
 * 在需求 / 测试用例 / 缺陷 / 测试计划 的标题+描述中模糊匹配（不区分大小写）。
 * 返回分组结果，每组最多 10 条。
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { projectId: string };
}

const TAKE = 10;

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, [
    'ADMIN', 'PM', 'QA', 'DEV', 'VIEWER',
  ]);
  if (!auth) {
    return NextResponse.json({ message: '无权访问该项目' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  if (!q) {
    return NextResponse.json({ requirements: [], testCases: [], defects: [], testPlans: [] });
  }

  const contains = { contains: q, mode: 'insensitive' as const };
  const base = { projectId: params.projectId };

  const [requirements, testCases, defects, testPlans] = await Promise.all([
    prisma.requirement.findMany({
      where: { ...base, OR: [{ title: contains }, { description: contains }] },
      select: { id: true, title: true, status: true, priority: true },
      take: TAKE,
    }),
    prisma.testCase.findMany({
      where: { ...base, OR: [{ title: contains }, { description: contains }] },
      select: { id: true, title: true, status: true, priority: true },
      take: TAKE,
    }),
    prisma.defect.findMany({
      where: { ...base, OR: [{ title: contains }, { description: contains }] },
      select: { id: true, title: true, status: true, severity: true },
      take: TAKE,
    }),
    prisma.testPlan.findMany({
      where: { ...base, OR: [{ title: contains }, { description: contains }] },
      select: { id: true, title: true, status: true },
      take: TAKE,
    }),
  ]);

  return NextResponse.json({ requirements, testCases, defects, testPlans });
}
