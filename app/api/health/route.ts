/**
 * 健康检查端点（容器编排 / 负载均衡探活）
 *
 * GET /api/health
 *   200 { status: 'ok', db: 'up' }      — DB 可连通
 *   503 { status: 'error', db: 'down' } — DB 不可达
 *
 * 无需鉴权，不返回任何敏感信息。
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/../lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', db: 'up', time: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'down', time: new Date().toISOString() },
      { status: 503 },
    );
  }
}
