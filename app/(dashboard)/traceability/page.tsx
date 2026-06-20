'use client';

/**
 * 追溯矩阵页面
 *
 * 展示 需求→测试点→测试用例→执行结果 的完整追溯链，
 * 覆盖状态用绿/黄/红色标识。
 */

import { useEffect, useState } from 'react';
import { useProject } from '@/renderer/hooks/useProject';
import { apiClient } from '@/../lib/api-client';
import { LinkSimple, CheckCircle, Warning, XCircle, ChartBar } from '@phosphor-icons/react';

interface MatrixItem {
  requirementId: string;
  requirementTitle: string;
  requirementPriority: string;
  requirementStatus: string;
  testPointCount: number;
  testCaseCount: number;
  totalExecutions: number;
  passCount: number;
  failCount: number;
  coverage: number;
  status: 'COVERED' | 'PARTIAL' | 'UNCOVERED';
  testPoints: { id: string; title: string; testCaseCount: number }[];
}

interface Summary {
  totalRequirements: number;
  covered: number;
  partial: number;
  uncovered: number;
  totalTestCases: number;
  totalExecutions: number;
}

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: '致命', HIGH: '高', MEDIUM: '中', LOW: '低',
};

export default function TraceabilityPage() {
  const { currentProject } = useProject();
  const [matrix, setMatrix] = useState<MatrixItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject?.id) return;
    setLoading(true);
    apiClient
      .getTraceabilityMatrix(currentProject.id)
      .then((data) => {
        setMatrix(data.matrix);
        setSummary(data.summary);
      })
      .finally(() => setLoading(false));
  }, [currentProject?.id]);

  if (loading) {
    return <div className="p-8 text-slate-500">加载中…</div>;
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-slate-50 dark:bg-slate-950 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">追溯矩阵</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">需求 → 测试点 → 测试用例 → 执行 完整追溯链</p>
      </div>

      {/* 汇总卡片 */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <SummaryCard label="总需求" value={summary.totalRequirements} icon={<LinkSimple size={18} />} color="text-blue-600" />
          <SummaryCard label="已覆盖" value={summary.covered} icon={<CheckCircle size={18} />} color="text-emerald-600" />
          <SummaryCard label="部分覆盖" value={summary.partial} icon={<Warning size={18} />} color="text-amber-600" />
          <SummaryCard label="未覆盖" value={summary.uncovered} icon={<XCircle size={18} />} color="text-red-600" />
          <SummaryCard label="测试用例" value={summary.totalTestCases} icon={<ChartBar size={18} />} color="text-purple-600" />
          <SummaryCard label="总执行次数" value={summary.totalExecutions} icon={<ChartBar size={18} />} color="text-slate-600" />
        </div>
      )}

      {/* 矩阵表格 */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">需求</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">优先级</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">测试点</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">用例数</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">执行</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">通过/失败</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 dark:text-slate-400">覆盖状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {matrix.map((item) => (
                <tr key={item.requirementId} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white max-w-xs truncate">
                      {item.requirementTitle}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      item.requirementPriority === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      item.requirementPriority === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {PRIORITY_LABELS[item.requirementPriority] || item.requirementPriority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                    {item.testPointCount}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                    {item.testCaseCount}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                    {item.totalExecutions}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-emerald-600 dark:text-emerald-400">{item.passCount}</span>
                    <span className="text-slate-400"> / </span>
                    <span className="text-red-600 dark:text-red-400">{item.failCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.status === 'COVERED' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 px-2 py-1 rounded">
                        <CheckCircle size={12} /> 已覆盖
                      </span>
                    )}
                    {item.status === 'PARTIAL' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30 px-2 py-1 rounded">
                        <Warning size={12} /> 部分
                      </span>
                    )}
                    {item.status === 'UNCOVERED' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30 px-2 py-1 rounded">
                        <XCircle size={12} /> 未覆盖
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {matrix.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    暂无数据 — 创建需求和测试用例后开始追溯
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <span className={color}>{icon}</span>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}
