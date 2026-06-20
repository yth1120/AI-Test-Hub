/**
 * Agent 单步任务（快速操作）
 *
 * POST /api/projects/:projectId/agent/task
 * Body: { requirementId, action }
 *   - ANALYZE_REQUIREMENT  → 返回 { type, content } QA 诊断
 *   - GENERATE_TEST_POINTS → 解析并入库 TestPoint，返回数组
 *   - GENERATE_AC          → 返回 { type, content } 验收标准
 *
 * Key 优先取项目设置中的 apiKey，回退到服务端环境变量。
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';
import { resolveApiKey } from '@/../lib/ai-keys';
import { aiService } from '@/main/ai-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { projectId: string };
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, ['ADMIN', 'PM', 'QA']);
  if (!auth) {
    return NextResponse.json({ message: '无权执行 Agent 任务' }, { status: 403 });
  }

  const { requirementId, action } = await request.json();

  const settings = await prisma.projectSettings.findUnique({
    where: { projectId: params.projectId },
  });
  const provider = settings?.aiProvider || 'OPENAI';
  const apiKey = settings?.apiKey || resolveApiKey(provider);
  if (!apiKey) {
    return NextResponse.json(
      { message: `未配置 ${provider} 的 API Key（请在项目设置或服务端环境变量中设置）` },
      { status: 400 },
    );
  }

  const requirement = await prisma.requirement.findUnique({ where: { id: requirementId } });
  if (!requirement) {
    return NextResponse.json({ message: '需求不存在' }, { status: 404 });
  }

  const gen = (type: string) =>
    aiService.generateContent(
      { type, requirement, aiProvider: provider } as any,
      apiKey,
      settings || undefined,
    );

  try {
    switch (action) {
      case 'ANALYZE_REQUIREMENT':
        return NextResponse.json(await gen('REQUIREMENT_ANALYSIS'));

      case 'GENERATE_AC':
        return NextResponse.json(await gen('AC_GENERATION'));

      case 'GENERATE_TEST_POINTS': {
        const result = await gen('TEST_POINTS');
        const lines = (result.content || '')
          .split('\n')
          .filter((l: string) => l.trim().startsWith('-') || l.trim().startsWith('*'));
        const points = [];
        for (const line of lines) {
          const tp = await prisma.testPoint.create({
            data: {
              title: line.replace(/^[-*]\s+/, '').trim(),
              requirementId,
              projectId: params.projectId,
              category: 'FUNCTIONAL',
              priority: 'MEDIUM',
            },
          });
          points.push(tp);
        }
        return NextResponse.json(points);
      }

      default:
        return NextResponse.json({ message: `未知 action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || 'Agent 任务失败' }, { status: 500 });
  }
}
