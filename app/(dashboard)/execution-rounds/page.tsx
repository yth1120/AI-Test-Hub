'use client';

/**
 * 测试执行轮次页面
 *
 * 创建轮次 → 批量执行测试用例 → 查看每轮通过率汇总
 */

import { useEffect, useState } from 'react';
import { useProject } from '@/renderer/hooks/useProject';
import { apiClient } from '@/../lib/api-client';
import { Plus, CheckCircle, XCircle, Clock, ChartBar } from '@phosphor-icons/react';

interface Round {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalExecutions: number;
  passCount: number;
  failCount: number;
  passRate: number;
}

interface PlanOption {
  id: string;
  title: string;
}

export default function ExecutionRoundsPage() {
  const { currentProject } = useProject();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPlanId, setNewPlanId] = useState('');
  const [creating, setCreating] = useState(false);

  const loadRounds = () => {
    if (!currentProject?.id) return;
    setLoading(true);
    apiClient.getExecutionRounds(currentProject.id).then(setRounds).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRounds();
    if (currentProject?.id) {
      apiClient.getTestPlans(currentProject.id).then((ps) => setPlans(ps as any)).catch(() => setPlans([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id]);

  async function handleCreate() {
    if (!newName.trim() || !currentProject?.id) return;
    setCreating(true);
    try {
      // 创建轮次时获取当前项目的测试用例
      const testCases = await apiClient.getTestCases(currentProject.id);
      await apiClient.createExecutionRound(currentProject.id, {
        name: newName.trim(),
        description: newDesc || undefined,
        testPlanId: newPlanId || undefined,
        testCaseIds: testCases.map((tc: any) => tc.id),
      });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setNewPlanId('');
      loadRounds();
    } finally {
      setCreating(false);
    }
  }

  if (loading && !rounds.length) {
    return <div className="p-8 text-slate-500">加载中…</div>;
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-slate-50 dark:bg-slate-950 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">执行轮次</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">按版本/计划批量执行测试用例并追踪结果</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> 新建轮次
        </button>
      </div>

      {/* 轮次列表 */}
      <div className="space-y-4">
        {rounds.map((round) => (
          <div key={round.id} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{round.name}</h3>
                {round.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{round.description}</p>
                )}
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                round.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {round.status === 'COMPLETED' ? '已完成' : '进行中'}
              </span>
            </div>

            {/* 进度条 */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span>通过率 {round.passRate}%</span>
                <span>{round.passCount + round.failCount} / {round.totalExecutions} 已执行</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${round.passRate}%` }}
                />
              </div>
            </div>

            {/* 统计 */}
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle size={14} /> {round.passCount} 通过
              </span>
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <XCircle size={14} /> {round.failCount} 失败
              </span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Clock size={14} />
                {round.totalExecutions - round.passCount - round.failCount} 待执行
              </span>
            </div>
          </div>
        ))}
        {rounds.length === 0 && (
          <div className="card p-12 text-center text-slate-400">
            <ChartBar size={48} className="mx-auto mb-3 opacity-30" />
            <p>暂无执行轮次</p>
            <p className="text-sm mt-1">创建第一个测试执行轮次开始追踪</p>
          </div>
        )}
      </div>

      {/* 创建轮次弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="card p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">新建执行轮次</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">轮次名称</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="如：v2.0 回归测试 第1轮"
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">描述（选填）</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="轮次目标、范围说明…"
                  className="input mt-1"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">测试计划（选填）</label>
                <select
                  value={newPlanId}
                  onChange={(e) => setNewPlanId(e.target.value)}
                  className="input mt-1"
                >
                  <option value="">不关联计划</option>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900">取消</button>
                <button onClick={handleCreate} disabled={creating || !newName.trim()} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {creating ? '创建中…' : '创建并纳入所有用例'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
