/**
 * 项目仪表盘统计
 *
 * GET /api/projects/:projectId/dashboard-stats
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

  const where = { projectId: params.projectId };

  const [totalRequirements, requirements, totalTestCases, testCases, totalDefects, openDefects, totalScripts, automatedCaseIds] =
    await Promise.all([
      prisma.requirement.count({ where }),
      prisma.requirement.findMany({ where, select: { testCoverage: true, status: true } }),
      prisma.testCase.count({ where }),
      prisma.testCase.findMany({ where, select: { status: true } }),
      prisma.defect.count({ where }),
      prisma.defect.count({ where: { ...where, status: { in: ['OPEN', 'IN_PROGRESS', 'REOPENED'] } } }),
      prisma.testScript.count({ where }),
      // 有脚本关联的去重用例 ID —— 用于自动化覆盖率
      prisma.testScript.findMany({
        where: { ...where, testCaseId: { not: null } },
        select: { testCaseId: true },
        distinct: ['testCaseId'],
      }),
    ]);

  // 需求维度
  const pendingReview = requirements.filter((r) => r.status === 'REVIEW').length;
  const lowCoverage = requirements.filter((r) => (r.testCoverage || 0) < 50).length;
  const midCoverage = requirements.filter((r) => (r.testCoverage || 0) >= 50 && (r.testCoverage || 0) < 80).length;
  const highCoverage = requirements.filter((r) => (r.testCoverage || 0) >= 80).length;
  const averageCoverage = requirements.length > 0
    ? Math.round(requirements.reduce((sum, r) => sum + (r.testCoverage || 0), 0) / requirements.length)
    : 0;

  // 用例维度
  const passedCases = testCases.filter((tc) => tc.status === 'PASS').length;
  const executedCases = testCases.filter((tc) => tc.status !== 'PENDING').length;
  const passRate = executedCases > 0 ? Math.round((passedCases / executedCases) * 100) : 0;
  // 自动化覆盖率 = 有脚本关联的用例数 / 总用例数
  const automatedCount = automatedCaseIds.length;
  const automationRate = totalTestCases > 0 ? Math.round((automatedCount / totalTestCases) * 100) : 0;
  const pendingExecution = testCases.filter((tc) => tc.status === 'PENDING').length;

  return NextResponse.json({
    totalRequirements,
    pendingReview,
    lowCoverage,
    midCoverage,
    highCoverage,
    averageCoverage,
    totalTestCases,
    passRate,
    automationRate,
    pendingExecution,
    totalDefects,
    openDefects,
    totalScripts,
  });
}
