/**
 * AI 生成端点 —— 接入真实 ai-service（Vercel AI SDK 多 provider）。
 *
 * POST /api/ai/generate
 * Body: AIContentParams { type, requirement:{title,description,code,language}, aiProvider?, projectId? }
 *
 * - Key 由服务端环境变量按 provider 提供（lib/ai-keys.resolveApiKey）。
 * - 模型/baseUrl/maxTokens/temperature 从 project_settings 读取（如有 projectId）。
 * - 未配置 Key：返回 400 错误（需部署前配置）。
 * - 调用失败：返回 500 及错误信息。
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';
import { resolveApiKey } from '@/../lib/ai-keys';
import { aiService } from '@/main/ai-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: '请求体格式错误' }, { status: 400 });
  }

  // 规范化 type：TestCasesPageEnhanced 传单数 TEST_CASE，ai-service 提示词用复数 TEST_CASES
  if (body.type === 'TEST_CASE') body.type = 'TEST_CASES';

  // 读取项目设置（provider/model/baseUrl/maxTokens/temperature）
  let settings: any = null;
  if (body.projectId) {
    settings = await prisma.projectSettings.findUnique({
      where: { projectId: body.projectId },
    });
  }

  const provider = body.aiProvider || settings?.aiProvider || 'OPENAI';
  // 项目设置中的 Key 优先，未填则回退到服务端环境变量
  const apiKey = settings?.apiKey || resolveApiKey(provider);
  const params = { ...body, aiProvider: provider };

  if (!apiKey) {
    return NextResponse.json(
      { message: `未配置 ${provider} 的 API Key（请在项目设置或服务端环境变量中设置）` },
      { status: 400 },
    );
  }

  try {
    const result = await aiService.generateContent(
      params,
      apiKey,
      settings || undefined,
    );
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'AI 生成失败' },
      { status: 500 },
    );
  }
}
