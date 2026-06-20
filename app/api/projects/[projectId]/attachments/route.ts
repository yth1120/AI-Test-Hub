/**
 * 附件 API（本地磁盘 + DB 元数据）
 *
 * GET  /api/projects/:projectId/attachments?targetType=Defect&targetId=xxx — 列表
 * POST /api/projects/:projectId/attachments — 上传（multipart/form-data）
 *   Fields: file, targetType (Requirement|TestCase|Defect), targetId
 *
 * 文件落盘到 public/uploads/<projectId>/<id>.<ext>，可通过 /uploads/... 直接访问。
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

interface RouteParams {
  params: { projectId: string };
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_TARGETS = ['Requirement', 'TestCase', 'Defect'];

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, [
    'ADMIN', 'PM', 'QA', 'DEV', 'VIEWER',
  ]);
  if (!auth) {
    return NextResponse.json({ message: '无权访问该项目' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get('targetType');
  const targetId = searchParams.get('targetId');

  const where: any = { projectId: params.projectId };
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;

  const attachments = await prisma.attachment.findMany({
    where,
    include: { uploader: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(attachments);
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, ['ADMIN', 'PM', 'QA', 'DEV']);
  if (!auth) {
    return NextResponse.json({ message: '无权上传附件' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const targetType = formData.get('targetType') as string | null;
    const targetId = formData.get('targetId') as string | null;

    if (!file) {
      return NextResponse.json({ message: '请上传文件' }, { status: 400 });
    }
    if (!targetType || !VALID_TARGETS.includes(targetType) || !targetId) {
      return NextResponse.json({ message: '缺少有效的 targetType / targetId' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: '文件大小不能超过 10MB' }, { status: 400 });
    }

    // 先建记录拿到 id，用 id 作为存储文件名（避免重名冲突 + 不可猜测）
    const ext = path.extname(file.name).slice(0, 12); // 限制扩展名长度
    const record = await prisma.attachment.create({
      data: {
        targetType,
        targetId,
        filename: file.name,
        storedPath: '', // 落盘后回填
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        uploaderId: auth.session.user.id,
        projectId: params.projectId,
      },
    });

    const relDir = path.join('uploads', params.projectId);
    const relPath = path.join(relDir, `${record.id}${ext}`).replace(/\\/g, '/');
    const absDir = path.join(process.cwd(), 'public', relDir);
    const absPath = path.join(process.cwd(), 'public', relPath);

    await mkdir(absDir, { recursive: true });
    await writeFile(absPath, Buffer.from(await file.arrayBuffer()));

    const updated = await prisma.attachment.update({
      where: { id: record.id },
      data: { storedPath: relPath },
      include: { uploader: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (error: any) {
    console.error('Attachment upload error:', error);
    return NextResponse.json({ message: `上传失败: ${error.message}` }, { status: 500 });
  }
}
