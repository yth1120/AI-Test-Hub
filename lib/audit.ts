/**
 * 审计日志工具
 *
 * 记录所有写操作（CREATE/UPDATE/DELETE），包含变更前后的值差异。
 *
 * 用法：
 *   await auditLog('CREATE', 'Requirement', req.id, req.title, null, req, userId, projectId);
 *   await auditLog('UPDATE', 'Requirement', id, title, oldData, newData, userId, projectId);
 *   await auditLog('DELETE', 'Requirement', id, title, oldData, null, userId, projectId);
 */

import { prisma } from './prisma';

type ActionType = 'CREATE' | 'UPDATE' | 'DELETE';
type EntityType = 'Project' | 'Requirement' | 'TestCase' | 'Defect' | 'TestScript' | 'ProjectSettings' | 'TestPlan' | 'Member';

/**
 * 计算两个对象的差异字段
 */
function computeChanges(
  oldData: Record<string, any> | null,
  newData: Record<string, any> | null,
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};

  if (!oldData && newData) {
    // CREATE: 所有字段都是新的
    for (const [key, value] of Object.entries(newData)) {
      if (value !== undefined && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
        changes[key] = { old: null, new: value };
      }
    }
  } else if (oldData && !newData) {
    // DELETE: 所有字段被删除
    for (const [key, value] of Object.entries(oldData)) {
      if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
        changes[key] = { old: value, new: null };
      }
    }
  } else if (oldData && newData) {
    // UPDATE: 只记录变化的字段
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    for (const key of allKeys) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
      const oldVal = oldData[key];
      const newVal = newData[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes[key] = { old: oldVal ?? null, new: newVal ?? null };
      }
    }
  }

  return changes;
}

export async function auditLog(
  action: ActionType,
  entity: EntityType,
  entityId: string,
  entityTitle: string | undefined,
  oldData: Record<string, any> | null,
  newData: Record<string, any> | null,
  userId: string,
  projectId: string,
) {
  try {
    const changes = computeChanges(oldData, newData);
    if (Object.keys(changes).length === 0 && action !== 'DELETE') return; // 无实际变更，跳过

    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        entityTitle: entityTitle || entityId,
        changes: JSON.stringify(changes),
        userId,
        projectId,
      },
    });
  } catch (error) {
    // 审计日志写入失败不应阻塞主流程
    console.error('[AuditLog] 写入失败:', error);
  }
}
