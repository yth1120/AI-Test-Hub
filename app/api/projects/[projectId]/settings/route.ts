/**
 * 项目设置 API
 *
 * GET  /api/projects/:projectId/settings  — 获取项目 AI 配置
 * PATCH /api/projects/:projectId/settings — 更新设置
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

  let settings = await prisma.projectSettings.findUnique({
    where: { projectId: params.projectId },
  });

  if (!settings) {
    settings = await prisma.projectSettings.create({
      data: { projectId: params.projectId },
    });
  }

  return NextResponse.json(settings);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, ['ADMIN', 'PM']);
  if (!auth) {
    return NextResponse.json({ message: '无权修改项目设置' }, { status: 403 });
  }

  const body = await request.json();
  const { aiProvider, apiKey, baseUrl, model, maxTokens, temperature, systemPromptRequirement, systemPromptTestPlan, systemPromptTestCase, systemPromptScript, enableStreaming } = body;

  const settings = await prisma.projectSettings.upsert({
    where: { projectId: params.projectId },
    create: {
      projectId: params.projectId,
      ...(apiKey !== undefined && { apiKey }),
      ...(aiProvider !== undefined && { aiProvider }),
      ...(baseUrl !== undefined && { baseUrl }),
      ...(model !== undefined && { model }),
      ...(maxTokens !== undefined && { maxTokens }),
      ...(temperature !== undefined && { temperature }),
      ...(systemPromptRequirement !== undefined && { systemPromptRequirement }),
      ...(systemPromptTestPlan !== undefined && { systemPromptTestPlan }),
      ...(systemPromptTestCase !== undefined && { systemPromptTestCase }),
      ...(systemPromptScript !== undefined && { systemPromptScript }),
      ...(enableStreaming !== undefined && { enableStreaming }),
    },
    update: {
      ...(apiKey !== undefined && { apiKey }),
      ...(aiProvider !== undefined && { aiProvider }),
      ...(baseUrl !== undefined && { baseUrl }),
      ...(model !== undefined && { model }),
      ...(maxTokens !== undefined && { maxTokens }),
      ...(temperature !== undefined && { temperature }),
      ...(systemPromptRequirement !== undefined && { systemPromptRequirement }),
      ...(systemPromptTestPlan !== undefined && { systemPromptTestPlan }),
      ...(systemPromptTestCase !== undefined && { systemPromptTestCase }),
      ...(systemPromptScript !== undefined && { systemPromptScript }),
      ...(enableStreaming !== undefined && { enableStreaming }),
    },
  });

  return NextResponse.json(settings);
}
