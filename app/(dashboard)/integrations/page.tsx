'use client';

/**
 * 集成设置页面
 *
 * 配置 CI webhook、GitHub 同步、显示 webhook URL 和 secret。
 */

import { useState } from 'react';
import { useProject } from '@/renderer/hooks/useProject';
import { LinkBreak, GithubLogo, Terminal, Copy, Check, ArrowsClockwise } from '@phosphor-icons/react';

export default function IntegrationsPage() {
  const { currentProject } = useProject();
  const [copied, setCopied] = useState<string | null>(null);
  const [githubRepo, setGithubRepo] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const webhookSecret = 'testhub-dev-webhook';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const junitUrl = `${baseUrl}/api/webhooks/junit?projectId=${currentProject?.id || ''}&secret=${webhookSecret}`;
  const githubUrl = `${baseUrl}/api/webhooks/github?projectId=${currentProject?.id || ''}`;

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleGitHubSync() {
    if (!currentProject?.id || !githubRepo.trim()) return;
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/webhooks/github?projectId=${currentProject.id}&repo=${encodeURIComponent(githubRepo.trim())}`);
      const data = await res.json();
      setSyncResult(data);
    } catch (err: any) {
      setSyncResult({ message: err.message });
    } finally {
      setSyncLoading(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">集成设置</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">CI/CD、Issue 追踪、代码仓库等外部工具集成</p>
        </div>

        {/* CI Webhook (JUnit) */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Terminal size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">CI JUnit 测试结果回流</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">接收 JUnit XML 格式的测试报告，自动写入 TestExecution 记录</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Webhook URL</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg break-all text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {junitUrl}
              </code>
              <button
                onClick={() => copyToClipboard(junitUrl, 'junit')}
                className="shrink-0 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {copied === 'junit' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Secret</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {webhookSecret}
              </code>
              <button
                onClick={() => copyToClipboard(webhookSecret, 'secret')}
                className="shrink-0 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {copied === 'secret' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400" />}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-medium">CI 配置示例（GitHub Actions）：</p>
            <pre className="text-xs mt-2 overflow-x-auto">
{`- name: Report test results
  run: |
    curl -X POST "${junitUrl}" \\
      -H "Content-Type: application/xml" \\
      --data-binary "@./test-results/junit.xml"`}
            </pre>
          </div>
        </div>

        {/* GitHub Issue Sync */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
              <GithubLogo size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">GitHub Issue 同步</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">拉取 GitHub Issues 并自动同步到缺陷跟踪</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">仓库（owner/repo）</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="如：facebook/react"
                className="input flex-1"
              />
              <button
                onClick={handleGitHubSync}
                disabled={syncLoading || !githubRepo.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                <ArrowsClockwise size={14} className={syncLoading ? 'animate-spin' : ''} />
                {syncLoading ? '同步中…' : '同步 Issues'}
              </button>
            </div>
          </div>

          <div className="text-sm text-slate-500 dark:text-slate-400">
            <p>需要设置环境变量 <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">GITHUB_TOKEN</code></p>
            <p className="mt-1">获取 Token: GitHub → Settings → Developer settings → Personal access tokens → Generate (repo scope)</p>
          </div>

          {syncResult && (
            <div className={`rounded-lg p-4 text-sm ${syncResult.message?.includes('失败') || syncResult.message?.includes('错误') ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'}`}>
              <p className="font-medium">{syncResult.message}</p>
              {syncResult.total !== undefined && (
                <p className="mt-1">共 {syncResult.total} 个 Issues — 新建 {syncResult.created} 个，更新 {syncResult.updated} 个</p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">GitHub Webhook URL（自动同步）</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg break-all text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {githubUrl}
              </code>
              <button
                onClick={() => copyToClipboard(githubUrl, 'github')}
                className="shrink-0 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {copied === 'github' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            将此 URL 添加到 GitHub 仓库的 Settings → Webhooks，选择 &quot;Issues&quot; 事件
          </p>
        </div>

        {/* 数据导入快捷入口 */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <LinkBreak size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Excel/CSV 导入</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">批量导入需求或测试用例</p>
            </div>
          </div>
          <a
            href="/import"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            打开导入页面 →
          </a>
        </div>
      </div>
    </div>
  );
}
