/**
 * GitHub Webhook — Issue 同步
 *
 * POST /api/webhooks/github?projectId=xxx
 * Header: X-GitHub-Event: issues
 * Body: GitHub issue payload
 *
 * 当 GitHub issue 创建/更新时，自动同步到 Defect 模型。
 * 同时也支持手动触发：POST /api/webhooks/github/sync?projectId=xxx
 * Body: { action: 'push', repo: 'owner/repo', issue: {...} }
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/../lib/prisma';
import { getWebhookSecret, verifyGithubSignature, verifyPlainSecret } from '@/../lib/webhook-auth';

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string | null;
  state: 'open' | 'closed';
  html_url: string;
  labels?: { name: string }[];
  created_at: string;
  updated_at: string;
  user: { login: string; id: number };
}

function mapIssueToDefect(issue: GitHubIssue, projectId: string) {
  const severity = issue.labels?.some((l) =>
    ['critical', 'bug', 'hotfix'].includes(l.name.toLowerCase()),
  )
    ? 'HIGH'
    : 'MEDIUM';

  const type = issue.labels?.some((l) =>
    ['enhancement', 'feature', 'improvement'].includes(l.name.toLowerCase()),
  )
    ? 'IMPROVEMENT'
    : 'BUG';

  return {
    title: `[GitHub #${issue.number}] ${issue.title}`,
    description: issue.body || null,
    severity,
    priority: 'MEDIUM',
    status: issue.state === 'closed' ? 'CLOSED' : 'OPEN',
    type,
    reporter: `github:${issue.user?.login ?? 'unknown'}`,
    steps: `GitHub Issue: ${issue.html_url}`,
    projectId,
  };
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ message: '缺少 projectId' }, { status: 400 });
  }

  // 验证 webhook secret（WEBHOOK_SECRET 环境变量）：
  // 优先 GitHub HMAC 签名（x-hub-signature-256），无签名则回退到 ?secret= 明文（手动触发）
  if (!getWebhookSecret()) {
    return NextResponse.json({ message: '服务端未配置 WEBHOOK_SECRET' }, { status: 503 });
  }
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  const authed = signature
    ? verifyGithubSignature(signature, rawBody)
    : verifyPlainSecret(searchParams.get('secret'));
  if (!authed) {
    return NextResponse.json({ message: 'webhook 签名/密钥无效' }, { status: 401 });
  }

  // 验证 project 存在
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ message: '项目不存在' }, { status: 404 });
  }

  try {
    const body = rawBody ? JSON.parse(rawBody) : {};
    const event = request.headers.get('x-github-event') || body.action || 'manual';

    if (event === 'issues' || event === 'manual' || body.issue) {
      const issue: GitHubIssue = body.issue || body;

      // 查找是否已存在对应缺陷（通过 title 前缀匹配）
      const prefix = `[GitHub #${issue.number}]`;
      const existing = await prisma.defect.findFirst({
        where: {
          projectId,
          title: { startsWith: prefix },
        },
      });

      const defectData = mapIssueToDefect(issue, projectId);

      if (existing) {
        // 更新现有缺陷
        const updated = await prisma.defect.update({
          where: { id: existing.id },
          data: {
            title: defectData.title,
            description: defectData.description,
            status: defectData.status,
            updatedAt: new Date(),
          },
        });
        return NextResponse.json({ action: 'updated', defect: updated });
      } else if (body.action !== 'closed') {
        // 创建新缺陷（已关闭的 issue 不创建）
        const created = await prisma.defect.create({ data: defectData });
        return NextResponse.json({ action: 'created', defect: created });
      }

      return NextResponse.json({ action: 'skipped' });
    }

    return NextResponse.json({ message: '不支持的事件类型', event }, { status: 400 });
  } catch (error: any) {
    console.error('GitHub webhook error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/github?projectId=xxx&repo=owner/repo
 * 拉取 GitHub issues 列表（用于手动同步）
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const repo = searchParams.get('repo');

  if (!projectId || !repo) {
    return NextResponse.json({ message: '缺少 projectId 或 repo 参数' }, { status: 400 });
  }

  // 获取 GitHub Token（从项目设置或环境变量）
  const token = process.env.GITHUB_TOKEN || '';
  if (!token) {
    return NextResponse.json({
      message: '未配置 GITHUB_TOKEN 环境变量。请在 .env 中设置 GITHUB_TOKEN=ghp_xxx',
      setupNote: '获取 Token: https://github.com/settings/tokens → Generate new token (repo scope)',
    }, { status: 400 });
  }

  try {
    const url = `https://api.github.com/repos/${repo}/issues?state=all&per_page=50`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'TestHub-Pro',
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ message: `GitHub API 错误: ${err}` }, { status: res.status });
    }

    const issues = (await res.json()) as GitHubIssue[];
    const results = { created: 0, updated: 0, skipped: 0 };

    for (const issue of issues) {
      // 跳过 PR（pull_request 对象存在表示是 PR）
      if ((issue as any).pull_request) { results.skipped++; continue; }

      const prefix = `[GitHub #${issue.number}]`;
      const existing = await prisma.defect.findFirst({
        where: { projectId, title: { startsWith: prefix } },
      });

      const defectData = mapIssueToDefect(issue, projectId);

      if (existing) {
        await prisma.defect.update({
          where: { id: existing.id },
          data: { title: defectData.title, description: defectData.description, status: defectData.status },
        });
        results.updated++;
      } else {
        await prisma.defect.create({ data: defectData });
        results.created++;
      }
    }

    return NextResponse.json({ message: '同步完成', repo, total: issues.length, ...results });
  } catch (error: any) {
    return NextResponse.json({ message: `同步失败: ${error.message}` }, { status: 500 });
  }
}
