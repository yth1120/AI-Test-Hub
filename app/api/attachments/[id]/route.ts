/**
 * 单个附件删除（删 DB 记录 + 磁盘文件）
 *
 * DELETE /api/attachments/:id
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';
import { unlink } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

interface RouteParams {
  params: { id: string };
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const record = await prisma.attachment.findUnique({ where: { id: params.id } });
  if (!record) {
    return NextResponse.json({ message: '附件不存在' }, { status: 404 });
  }

  const auth = await requireProjectRole(record.projectId, ['ADMIN', 'PM', 'QA', 'DEV']);
  if (!auth) {
    return NextResponse.json({ message: '无权删除该附件' }, { status: 403 });
  }

  // 先删磁盘文件（失败不阻塞删记录）
  if (record.storedPath) {
    try {
      await unlink(path.join(process.cwd(), 'public', record.storedPath));
    } catch (e) {
      console.error('删除附件文件失败:', e);
    }
  }

  await prisma.attachment.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
