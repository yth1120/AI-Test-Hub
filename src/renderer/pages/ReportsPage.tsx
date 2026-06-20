import React, { useState } from 'react';
import { FileText, Flask, Bug, TrendUp, DownloadSimple, CaretDown } from '@phosphor-icons/react';
import { useProjectStats } from '../hooks/useProjectStats';
import { useRequirementsEnhanced } from '../hooks/useRequirementsEnhanced';
import { useTestCases } from '../hooks/useTestCases';
import { useDefects } from '../hooks/useDefects';

export const ReportsPage: React.FC = () => {
  const { stats } = useProjectStats();
  const { requirements } = useRequirementsEnhanced();
  const { testCases } = useTestCases();
  const { defects } = useDefects();
  const [reportType, setReportType] = useState<'overview' | 'coverage' | 'defects'>('overview');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const statusDistribution = {
    DRAFT: requirements.filter(r => r.status === 'DRAFT').length,
    REVIEW: requirements.filter(r => r.status === 'REVIEW').length,
    IN_PROGRESS: requirements.filter(r => r.status === 'IN_PROGRESS').length,
    APPROVED: requirements.filter(r => r.status === 'APPROVED').length,
  };

  const testCaseStatusDistribution = {
    PENDING: testCases.filter(tc => tc.status === 'PENDING').length,
    PASS: testCases.filter(tc => tc.status === 'PASS').length,
    FAIL: testCases.filter(tc => tc.status === 'FAIL').length,
    BLOCKED: testCases.filter(tc => tc.status === 'BLOCKED').length,
  };

  const defectSeverityDistribution = {
    CRITICAL: defects.filter(d => d.severity === 'CRITICAL').length,
    HIGH: defects.filter(d => d.severity === 'HIGH').length,
    MEDIUM: defects.filter(d => d.severity === 'MEDIUM').length,
    LOW: defects.filter(d => d.severity === 'LOW').length,
  };

  // 报表数据集（各导出格式共用）
  const buildDatasets = () => ({
    汇总: [
      { 指标: '总需求数', 值: stats.totalRequirements },
      { 指标: '待评审需求', 值: stats.pendingReview },
      { 指标: '平均覆盖率(%)', 值: stats.averageCoverage },
      { 指标: '总用例数', 值: stats.totalTestCases },
      { 指标: '用例通过率(%)', 值: stats.passRate },
      { 指标: '自动化率(%)', 值: stats.automationRate },
      { 指标: '待执行用例', 值: stats.pendingExecution },
      { 指标: '缺陷总数', 值: stats.totalDefects },
      { 指标: '未关闭缺陷', 值: stats.openDefects },
      { 指标: '脚本总数', 值: stats.totalScripts },
    ],
    需求: requirements.map(r => ({ ID: r.id, 标题: r.title, 状态: r.status, 优先级: r.priority, '覆盖率(%)': r.testCoverage ?? 0 })),
    测试用例: testCases.map(tc => ({ ID: tc.id, 标题: tc.title, 状态: tc.status, 优先级: tc.priority, 分类: (tc as any).category || '' })),
    缺陷: defects.map(d => ({ ID: d.id, 标题: d.title, 严重程度: d.severity, 状态: d.status, 负责人: (d as any).assignee || '' })),
  });

  const today = () => new Date().toISOString().split('T')[0];

  const download = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `testhub-report-${today()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const ds = buildDatasets();
    const wb = XLSX.utils.book_new();
    for (const [sheet, rows] of Object.entries(ds)) {
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 说明: '暂无数据' }]);
      XLSX.utils.book_append_sheet(wb, ws, sheet);
    }
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    download(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'xlsx');
  };

  const exportCSV = async () => {
    const XLSX = await import('xlsx');
    const ds = buildDatasets();
    // CSV 单表：拼接各数据集，区块间空行分隔
    const parts: string[] = [];
    for (const [name, rows] of Object.entries(ds)) {
      parts.push(`# ${name}`);
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 说明: '暂无数据' }]);
      parts.push(XLSX.utils.sheet_to_csv(ws));
      parts.push('');
    }
    // UTF-8 BOM 让 Excel 正确识别中文
    download(new Blob(['﻿' + parts.join('\n')], { type: 'text/csv;charset=utf-8' }), 'csv');
  };

  const exportJSON = () => {
    const data = { generatedAt: new Date().toISOString(), ...buildDatasets() };
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'json');
  };

  const handleExport = (format: 'xlsx' | 'csv' | 'json') => {
    setExportMenuOpen(false);
    if (format === 'xlsx') exportExcel();
    else if (format === 'csv') exportCSV();
    else exportJSON();
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-slate-200/50 dark:bg-slate-950/50 p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">测试报告</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">查看测试进度和质量指标报告</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            {[
              { key: 'overview', label: '总览' },
              { key: 'coverage', label: '覆盖率' },
              { key: 'defects', label: '缺陷' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setReportType(tab.key as any)}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${reportType === tab.key ? 'bg-accent text-white' : 'text-muted hover:bg-surface-2'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(v => !v)}
              onBlur={() => setTimeout(() => setExportMenuOpen(false), 150)}
              className="flex items-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
              <DownloadSimple size={16} className="mr-2" />
              导出报告
              <CaretDown size={14} className="ml-2" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-10">
                {[
                  { fmt: 'xlsx' as const, label: 'Excel (.xlsx)' },
                  { fmt: 'csv' as const, label: 'CSV (.csv)' },
                  { fmt: 'json' as const, label: 'JSON (.json)' },
                ].map(opt => (
                  <button
                    key={opt.fmt}
                    onMouseDown={() => handleExport(opt.fmt)}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {reportType === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard icon={<FileText size={20} />} label="总需求数" value={stats.totalRequirements} sub={`${stats.pendingReview} 待评审`} color="blue" />
            <StatCard icon={<Flask size={20} />} label="测试用例" value={stats.totalTestCases} sub={`通过率 ${stats.passRate}%`} color="emerald" />
            <StatCard icon={<Bug size={20} />} label="缺陷总数" value={stats.totalDefects} sub={`${stats.openDefects} 未关闭`} color="red" />
            <StatCard icon={<TrendUp size={20} />} label="平均覆盖率" value={`${stats.averageCoverage}%`} sub={`${stats.lowCoverage} 个需求不足`} color="amber" />
            <StatCard icon={<TrendUp size={20} />} label="自动化率" value={`${stats.automationRate}%`} sub={`${stats.totalScripts} 个脚本`} color="indigo" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-4">需求状态分布</h3>
              <div className="space-y-3">
                {Object.entries(statusDistribution).map(([status, count]) => {
                  const labels: Record<string, string> = { DRAFT: '草稿', REVIEW: '待评审', IN_PROGRESS: '开发/测试中', APPROVED: '已批准' };
                  const colors: Record<string, string> = { DRAFT: 'bg-surface-2', REVIEW: 'bg-amber-500', IN_PROGRESS: 'bg-accent', APPROVED: 'bg-emerald-500' };
                  const pct = requirements.length > 0 ? Math.round((count / requirements.length) * 100) : 0;
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 dark:text-slate-300">{labels[status] || status}</span>
                        <span className="text-slate-600 dark:text-slate-400">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                        <div className={`${colors[status]} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-4">测试用例状态分布</h3>
              <div className="space-y-3">
                {Object.entries(testCaseStatusDistribution).map(([status, count]) => {
                  const labels: Record<string, string> = { PENDING: '待执行', PASS: '通过', FAIL: '失败', BLOCKED: '阻塞' };
                  const colors: Record<string, string> = { PENDING: 'bg-slate-400', PASS: 'bg-emerald-500', FAIL: 'bg-red-500', BLOCKED: 'bg-amber-500' };
                  const pct = testCases.length > 0 ? Math.round((count / testCases.length) * 100) : 0;
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 dark:text-slate-300">{labels[status] || status}</span>
                        <span className="text-slate-600 dark:text-slate-400">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                        <div className={`${colors[status]} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {reportType === 'coverage' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">需求测试覆盖率详情</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-300 dark:border-slate-700">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">需求ID</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">需求标题</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">状态</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase w-64">覆盖率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requirements.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">{req.id}</td>
                    <td className="px-6 py-3 text-sm text-slate-800 dark:text-slate-200">{req.title}</td>
                    <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">{req.status}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div className={`h-2 rounded-full ${(req.testCoverage || 0) >= 80 ? 'bg-emerald-500' : (req.testCoverage || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${req.testCoverage || 0}%` }} />
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 w-12 text-right">{req.testCoverage || 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'defects' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200 mb-4">缺陷严重程度分布</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(defectSeverityDistribution).map(([sev, count]) => {
                const labels: Record<string, string> = { CRITICAL: '严重', HIGH: '高', MEDIUM: '中', LOW: '低' };
                const colors: Record<string, string> = { CRITICAL: 'bg-surface-2 text-muted', HIGH: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400', MEDIUM: 'bg-surface-2 text-muted', LOW: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300' };
                return (
                  <div key={sev} className={`text-center p-4 rounded-lg ${colors[sev]}`}>
                    <div className="text-3xl font-bold">{count}</div>
                    <div className="text-sm mt-1">{labels[sev]}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">缺陷列表</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-300 dark:border-slate-700">
                    <th className="px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">ID</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">标题</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">严重程度</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">状态</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">负责人</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {defects.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-6 py-3 text-sm font-mono text-slate-600 dark:text-slate-400">{d.id}</td>
                      <td className="px-6 py-3 text-sm text-slate-800 dark:text-slate-200">{d.title}</td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">{d.severity}</td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">{d.status}</td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">{d.assignee || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }> = ({ icon, label, value, sub, color }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-surface-2 text-muted',
    emerald: 'bg-surface-2 text-muted',
    red: 'bg-surface-2 text-muted',
    amber: 'bg-surface-2 text-muted',
    indigo: 'bg-accent/10 text-accent',
  };
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-4">
      <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>{icon}</div>
      <div>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 block">{label}</span>
        <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</span>
        {sub && <span className="text-xs text-slate-400 dark:text-slate-500 block">{sub}</span>}
      </div>
    </div>
  );
};
