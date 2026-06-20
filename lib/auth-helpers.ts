/**
 * 服务端认证辅助函数
 *
 * API Route 用法：
 *   const auth = await requireProjectRole(projectId, ['ADMIN', 'PM']);
 *   if (!auth) return NextResponse.json({ message: '无权访问' }, { status: 403 });
 *   // auth.session.user.id, auth.membership.role 可用
 */

import { getServerSession as nextAuthGetServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from './auth';
import { prisma } from './prisma';

export type AuthSession = Session;

export interface ProjectAuth {
  session: AuthSession;
  membership: {
    id: string;
    userId: string;
    projectId: string;
    role: string;
  };
}

/** 获取当前会话（未登录返回 null） */
export async function getServerSession(): Promise<AuthSession | null> {
  return nextAuthGetServerSession(authOptions);
}

/** 要求登录，未登录返回 null */
export async function requireAuth(): Promise<AuthSession | null> {
  const session = await getServerSession();
  if (!session?.user?.id) return null;
  return session;
}

/**
 * 要求项目角色
 * @returns { session, membership } 或 null（未登录 / 无权限）
 */
export async function requireProjectRole(
  projectId: string,
  allowedRoles: string[],
): Promise<ProjectAuth | null> {
  const session = await requireAuth();
  if (!session) return null;

  const membership = await prisma.projectMembership.findUnique({
    where: {
      userId_projectId: {
        userId: session.user.id,
        projectId,
      },
    },
  });

  if (!membership || !allowedRoles.includes(membership.role)) {
    return null;
  }

  return { session, membership };
}
