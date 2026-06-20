/**
 * 单个缺陷 CRUD
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';
import { notifyByAssignee } from '@/../lib/notify';

interface RouteParams {
  params: { id: string };
}

async function getAuth(defectId: string, roles: string[]) {
  const d = await prisma.defect.findUnique({
    where: { id: defectId },
    select: { projectId: true },
  });
  if (!d) return null;
  return requireProjectRole(d.projectId, roles);
}

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM', 'QA', 'DEV', 'VIEWER']);
  if (!auth) {
    return NextResponse.json({ message: '缺陷不存在或无权访问' }, { status: 404 });
  }

  const defect = await prisma.defect.findUnique({
    where: { id: params.id },
    include: {
      testCase: true,
      rootCauseReports: true,
    },
  });

  return NextResponse.json(defect);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM', 'QA', 'DEV']);
  if (!auth) {
    return NextResponse.json({ message: '无权修改该缺陷' }, { status: 403 });
  }

  const old = await prisma.defect.findUnique({ where: { id: params.id } });

  const body = await request.json();
  const { title, description, steps, status, severity, priority, assignee, environment } = body;

  const updated = await prisma.defect.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(steps !== undefined && { steps }),
      ...(status !== undefined && { status }),
      ...(severity !== undefined && { severity }),
      ...(priority !== undefined && { priority }),
      ...(assignee !== undefined && { assignee }),
      ...(environment !== undefined && { environment }),
      ...(status === 'RESOLVED' || status === 'CLOSED' ? { resolvedAt: new Date() } : {}),
    },
  });

  // 指派变化 → 通知新负责人
  if (assignee !== undefined && assignee && assignee !== old?.assignee) {
    await notifyByAssignee(assignee, auth.session.user.id, {
      projectId: updated.projectId,
      type: 'ASSIGNED',
      title: `缺陷指派给你：${updated.title}`,
      body: `严重程度 ${updated.severity} · 状态 ${updated.status}`,
      targetType: 'Defect',
      targetId: updated.id,
    });
  }
  // 状态变化 → 通知负责人（若非操作者本人）
  if (status !== undefined && old && status !== old.status && updated.assignee) {
    await notifyByAssignee(updated.assignee, auth.session.user.id, {
      projectId: updated.projectId,
      type: 'STATUS_CHANGED',
      title: `缺陷状态变更：${updated.title}`,
      body: `${old.status} → ${status}`,
      targetType: 'Defect',
      targetId: updated.id,
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await getAuth(params.id, ['ADMIN', 'PM']);
  if (!auth) {
    return NextResponse.json({ message: '缺陷不存在或无权删除' }, { status: 403 });
  }

  await prisma.defect.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
