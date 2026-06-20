/**
 * Excel/CSV 批量导入 API
 *
 * POST /api/projects/:projectId/import
 * Content-Type: multipart/form-data
 * Fields: file (xlsx/csv), type (Requirement|TestCase), mapping (JSON)
 *
 * 返回导入结果（成功数、失败数、错误详情）。
 */

import { NextResponse } from 'next/server';
import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';
import { auditLog } from '@/../lib/audit';
import * as XLSX from 'xlsx';

interface RouteParams {
  params: { projectId: string };
}

// 文件大小上限 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, ['ADMIN', 'PM', 'QA']);
  if (!auth) {
    return NextResponse.json({ message: '无权导入数据' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const importType = (formData.get('type') as string) || 'Requirement';
    const mappingStr = (formData.get('mapping') as string) || '{}';

    if (!file) {
      return NextResponse.json({ message: '请上传文件' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: '文件大小不能超过 10MB' }, { status: 400 });
    }

    // 解析文件
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    if (!rows.length) {
      return NextResponse.json({ message: '文件中没有数据行' }, { status: 400 });
    }

    // 字段映射：{ "A": "title", "B": "description", ... }
    const mapping = JSON.parse(mappingStr) as Record<string, string>;

    // 自动检测表头映射
    let fieldMap: Record<string, string>;
    if (Object.keys(mapping).length > 0) {
      fieldMap = mapping;
    } else {
      fieldMap = autoDetectMapping(rows[0], importType);
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i];
        const mapped = mapRow(row, fieldMap);

        if (importType === 'Requirement') {
          const req = await prisma.requirement.create({
            data: {
              title: mapped.title || `导入需求 #${i + 1}`,
              description: mapped.description || null,
              priority: normalizePriority(mapped.priority),
              status: 'DRAFT',
              author: auth.session.user.name || auth.session.user.email,
              projectId: params.projectId,
            },
          });
          await auditLog('CREATE', 'Requirement', req.id, req.title, null, req, auth.session.user.id, params.projectId);
        } else if (importType === 'TestCase') {
          await prisma.testCase.create({
            data: {
              title: mapped.title || `导入用例 #${i + 1}`,
              description: mapped.description || null,
              steps: JSON.stringify(parseSteps(mapped.steps)),
              expectedResult: mapped.expectedResult || '',
              priority: normalizePriority(mapped.priority),
              status: 'PENDING',
              category: normalizeCategory(mapped.category),
              preconditions: mapped.preconditions || null,
              author: auth.session.user.name || auth.session.user.email,
              projectId: params.projectId,
              ...(mapped.requirementId && { requirementId: mapped.requirementId }),
            },
          });
        }

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`第 ${i + 2} 行: ${error.message}`);
        if (results.errors.length > 20) {
          results.errors.push('... 更多错误已省略');
          break;
        }
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ message: `导入失败: ${error.message}` }, { status: 500 });
  }
}

/** 自动检测字段映射 */
function autoDetectMapping(headers: Record<string, any>, type: string): Record<string, string> {
  const map: Record<string, string> = {};

  const knowns: Record<string, string[]> = {
    title: ['title', '标题', 'name', '名称', 'subject', '主题'],
    description: ['description', '描述', 'desc', '说明', 'detail', '详情'],
    priority: ['priority', '优先级', 'level', '级别', 'severity', '严重程度'],
    status: ['status', '状态'],
  };

  if (type === 'TestCase') {
    Object.assign(knowns, {
      steps: ['steps', '步骤', 'test steps', '测试步骤', 'procedure'],
      expectedResult: ['expectedresult', 'expected result', '预期结果', 'expected', '期望结果'],
      preconditions: ['preconditions', '前置条件', 'prerequisites', '前提'],
      category: ['category', '分类', 'type', '类型', 'module', '模块'],
    });
  }

  for (const key of Object.keys(headers)) {
    const lower = key.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(knowns)) {
      if (aliases.some((a) => lower.includes(a))) {
        map[field] = key;
        break;
      }
    }
    if (!Object.values(map).includes(key)) {
      // 未识别的列，保留原名
      map[lower] = key;
    }
  }

  return map;
}

function mapRow(row: Record<string, any>, fieldMap: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [field, colName] of Object.entries(fieldMap)) {
    if (row[colName] !== undefined) {
      mapped[field] = String(row[colName]).trim();
    }
  }
  return mapped;
}

function normalizePriority(p?: string): string {
  if (!p) return 'MEDIUM';
  const upper = p.toUpperCase();
  if (upper.includes('CRITICAL') || upper.includes('致命')) return 'CRITICAL';
  if (upper.includes('HIGH') || upper.includes('高')) return 'HIGH';
  if (upper.includes('LOW') || upper.includes('低')) return 'LOW';
  return 'MEDIUM';
}

function normalizeCategory(c?: string): string {
  if (!c) return 'FUNCTIONAL';
  const upper = c.toUpperCase();
  const map: Record<string, string> = {
    '功能': 'FUNCTIONAL', 'FUNCTIONAL': 'FUNCTIONAL', '功能测试': 'FUNCTIONAL',
    '性能': 'PERFORMANCE', 'PERFORMANCE': 'PERFORMANCE', '性能测试': 'PERFORMANCE',
    '安全': 'SECURITY', 'SECURITY': 'SECURITY', '安全测试': 'SECURITY',
    '兼容': 'COMPATIBILITY', 'COMPATIBILITY': 'COMPATIBILITY',
    '回归': 'REGRESSION', 'REGRESSION': 'REGRESSION',
    '冒烟': 'SMOKE', 'SMOKE': 'SMOKE',
    '端到端': 'E2E', 'E2E': 'E2E',
  };
  for (const [cn, en] of Object.entries(map)) {
    if (upper.includes(cn)) return en;
  }
  return 'FUNCTIONAL';
}

function parseSteps(steps?: string): string[] {
  if (!steps) return [];
  // 支持换行符、分号、数字序号分隔
  const lines = steps.split(/[\n\r;；]+/).map((s) => s.replace(/^\d+[.)、]\s*/, '').trim()).filter(Boolean);
  return lines.length > 0 ? lines : [steps];
}
