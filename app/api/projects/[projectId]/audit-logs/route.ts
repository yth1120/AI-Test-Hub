/**
 * 审计日志查询 API
 *
 * GET /api/projects/:projectId/audit-logs
 * Query: ?entity=&action=&limit=50
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';

interface RouteParams {
  params: { projectId: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, [
    'ADMIN', 'PM', 'QA',
  ]);
  if (!auth) {
    return NextResponse.json({ message: '无权查看审计日志' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entity = searchParams.get('entity');
  const action = searchParams.get('action');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

  const where: any = { projectId: params.projectId };
  if (entity) where.entity = entity;
  if (action) where.action = action;

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json(logs);
}
