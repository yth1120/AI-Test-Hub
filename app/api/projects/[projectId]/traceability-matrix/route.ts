/**
 * 追溯矩阵 API
 *
 * GET /api/projects/:projectId/traceability-matrix
 * 返回 需求→测试点→测试用例→测试执行 的完整追溯链
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

  // 获取所有需求及其关联的测试用例、测试点、执行记录
  const requirements = await prisma.requirement.findMany({
    where: { projectId: params.projectId },
    include: {
      testPoints: {
        include: {
          testCases: {
            include: {
              executions: { orderBy: { executedAt: 'desc' }, take: 5 },
            },
          },
        },
      },
      testCases: {
        include: {
          executions: { orderBy: { executedAt: 'desc' }, take: 5 },
        },
      },
    },
    orderBy: { priority: 'asc' },
  });

  // 构建追溯矩阵
  const matrix = requirements.map((req) => {
    // 直接从需求关联的测试用例（无测试点的情况）
    const directTestCases = req.testCases || [];
    // 通过测试点关联的测试用例
    const pointTestCases = req.testPoints?.flatMap((tp) => tp.testCases || []) || [];
    // 合并去重
    const allTestCases = [...directTestCases, ...pointTestCases].filter(
      (tc, i, arr) => arr.findIndex((t) => t.id === tc.id) === i,
    );

    const totalExecutions = allTestCases.reduce(
      (sum, tc) => sum + (tc.executions?.length || 0),
      0,
    );
    const passCount = allTestCases.reduce(
      (sum, tc) =>
        sum + (tc.executions?.filter((e) => e.status === 'PASS')?.length || 0),
      0,
    );
    const failCount = allTestCases.reduce(
      (sum, tc) =>
        sum + (tc.executions?.filter((e) => e.status === 'FAIL')?.length || 0),
      0,
    );

    // 判断覆盖状态
    const hasTests = allTestCases.length > 0;
    const hasPassingTests = passCount > 0;
    const coverage = hasTests ? Math.round((passCount / Math.max(totalExecutions, 1)) * 100) : 0;

    let status: 'COVERED' | 'PARTIAL' | 'UNCOVERED';
    if (!hasTests) status = 'UNCOVERED';
    else if (hasPassingTests && failCount === 0) status = 'COVERED';
    else status = 'PARTIAL';

    return {
      requirementId: req.id,
      requirementTitle: req.title,
      requirementPriority: req.priority,
      requirementStatus: req.status,
      testPointCount: req.testPoints?.length || 0,
      testCaseCount: allTestCases.length,
      totalExecutions,
      passCount,
      failCount,
      coverage,
      status,
      testPoints: req.testPoints?.map((tp) => ({
        id: tp.id,
        title: tp.title,
        testCaseCount: tp.testCases?.length || 0,
      })),
    };
  });

  // 汇总统计
  const summary = {
    totalRequirements: requirements.length,
    covered: matrix.filter((m) => m.status === 'COVERED').length,
    partial: matrix.filter((m) => m.status === 'PARTIAL').length,
    uncovered: matrix.filter((m) => m.status === 'UNCOVERED').length,
    totalTestCases: matrix.reduce((s, m) => s + m.testCaseCount, 0),
    totalExecutions: matrix.reduce((s, m) => s + m.totalExecutions, 0),
  };

  return NextResponse.json({ matrix, summary });
}
