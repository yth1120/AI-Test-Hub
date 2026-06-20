/**
 * 通知工具 —— 供 API 路由在写操作时发站内信。
 *
 * 用法：
 *   await notify({ userId, projectId, type: 'ASSIGNED', title: '...', targetType: 'Defect', targetId });
 *
 * 失败不抛出（不阻塞主流程）。按 email/name 解析接收者时用 notifyByAssignee。
 */

import { prisma } from './prisma';

type NotificationType = 'ASSIGNED' | 'STATUS_CHANGED' | 'MENTIONED' | 'COMMENT';

interface NotifyParams {
  userId: string;
  projectId: string;
  type: NotificationType;
  title: string;
  body?: string;
  targetType?: string;
  targetId?: string;
}

export async function notify(params: NotifyParams) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        projectId: params.projectId,
        type: params.type,
        title: params.title,
        body: params.body || null,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
      },
    });
  } catch (error) {
    console.error('[notify] 写入失败:', error);
  }
}

/**
 * 按 assignee（可能是 name 或 email）解析为项目成员用户并发通知。
 * 找不到对应用户则静默跳过。不给操作者本人发（avoid self-notify）。
 */
export async function notifyByAssignee(
  assignee: string | null | undefined,
  actorUserId: string,
  params: Omit<NotifyParams, 'userId'>,
) {
  if (!assignee) return;
  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: assignee }, { name: assignee }] },
      select: { id: true },
    });
    if (!user || user.id === actorUserId) return;
    await notify({ ...params, userId: user.id });
  } catch (error) {
    console.error('[notifyByAssignee] 失败:', error);
  }
}
