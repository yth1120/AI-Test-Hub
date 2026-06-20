/**
 * 项目成员管理
 *
 * GET  /api/projects/:projectId/members  — 成员列表（全角色可看）
 * POST /api/projects/:projectId/members  — 添加成员（ADMIN/PM）
 *   Body: { email, role? }  role 缺省 QA；按邮箱找已注册用户，幂等加入。
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';
import { auditLog } from '@/../lib/audit';

interface RouteParams {
  params: { projectId: string };
}

const VALID_ROLES = ['ADMIN', 'PM', 'QA', 'DEV', 'VIEWER'];

export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, [
    'ADMIN', 'PM', 'QA', 'DEV', 'VIEWER',
  ]);
  if (!auth) {
    return NextResponse.json({ message: '无权访问该项目' }, { status: 403 });
  }

  const members = await prisma.projectMembership.findMany({
    where: { projectId: params.projectId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(members);
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, ['ADMIN', 'PM']);
  if (!auth) {
    return NextResponse.json({ message: '无权添加成员' }, { status: 403 });
  }

  const body = await request.json();
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const role = body.role && VALID_ROLES.includes(body.role) ? body.role : 'QA';

  if (!email) {
    return NextResponse.json({ message: '请输入成员邮箱' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { message: `邮箱 ${email} 尚未注册，请让对方先在 /register 注册` },
      { status: 404 },
    );
  }

  // 幂等：已是成员则更新角色，否则创建
  const membership = await prisma.projectMembership.upsert({
    where: { userId_projectId: { userId: user.id, projectId: params.projectId } },
    create: { userId: user.id, projectId: params.projectId, role },
    update: { role },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  await auditLog(
    'CREATE', 'Member', membership.id,
    user.name || user.email, null, { email: user.email, role },
    auth.session.user.id, params.projectId,
  );

  return NextResponse.json(membership, { status: 201 });
}
