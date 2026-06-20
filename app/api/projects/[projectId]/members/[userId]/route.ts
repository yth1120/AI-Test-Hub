/**
 * 单个项目成员：改角色 / 移除（仅 ADMIN）
 *
 * PATCH  /api/projects/:projectId/members/:userId  Body: { role }
 * DELETE /api/projects/:projectId/members/:userId
 *
 * 防呆：不能降级/移除最后一个 ADMIN；不能移除项目 owner。
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';
import { auditLog } from '@/../lib/audit';

interface RouteParams {
  params: { projectId: string; userId: string };
}

const VALID_ROLES = ['ADMIN', 'PM', 'QA', 'DEV', 'VIEWER'];

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, ['ADMIN']);
  if (!auth) {
    return NextResponse.json({ message: '仅管理员可修改成员角色' }, { status: 403 });
  }

  const { role } = await request.json();
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ message: '无效的角色' }, { status: 400 });
  }

  const target = await prisma.projectMembership.findUnique({
    where: { userId_projectId: { userId: params.userId, projectId: params.projectId } },
  });
  if (!target) {
    return NextResponse.json({ message: '该成员不存在' }, { status: 404 });
  }

  // 防呆：不能把最后一个 ADMIN 降级
  if (target.role === 'ADMIN' && role !== 'ADMIN') {
    const adminCount = await prisma.projectMembership.count({
      where: { projectId: params.projectId, role: 'ADMIN' },
    });
    if (adminCount <= 1) {
      return NextResponse.json({ message: '项目至少保留一名管理员' }, { status: 400 });
    }
  }

  const updated = await prisma.projectMembership.update({
    where: { userId_projectId: { userId: params.userId, projectId: params.projectId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  await auditLog(
    'UPDATE', 'Member', updated.id,
    updated.user.name || updated.user.email,
    { role: target.role }, { role }, auth.session.user.id, params.projectId,
  );

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, ['ADMIN']);
  if (!auth) {
    return NextResponse.json({ message: '仅管理员可移除成员' }, { status: 403 });
  }

  const target = await prisma.projectMembership.findUnique({
    where: { userId_projectId: { userId: params.userId, projectId: params.projectId } },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!target) {
    return NextResponse.json({ message: '该成员不存在' }, { status: 404 });
  }

  // 防呆：不能移除项目 owner
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { ownerId: true },
  });
  if (project?.ownerId === params.userId) {
    return NextResponse.json({ message: '不能移除项目所有者' }, { status: 400 });
  }

  // 防呆：不能移除最后一个 ADMIN
  if (target.role === 'ADMIN') {
    const adminCount = await prisma.projectMembership.count({
      where: { projectId: params.projectId, role: 'ADMIN' },
    });
    if (adminCount <= 1) {
      return NextResponse.json({ message: '项目至少保留一名管理员' }, { status: 400 });
    }
  }

  await prisma.projectMembership.delete({
    where: { userId_projectId: { userId: params.userId, projectId: params.projectId } },
  });

  await auditLog(
    'DELETE', 'Member', target.id,
    target.user.name || target.user.email,
    { email: target.user.email, role: target.role }, null,
    auth.session.user.id, params.projectId,
  );

  return NextResponse.json({ success: true });
}
