import React from 'react';
import { FileText, Clock, Warning, TrendUp, Flask, Gear, Bug, Code } from '@phosphor-icons/react';
import { useProjectStats } from '../hooks/useProjectStats';

export const DashboardPage: React.FC = () => {
  const { stats, loading } = useProjectStats();

  if (loading) {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-canvas p-8">
        <div className="text-center text-muted">加载中...</div>
      </div>
    );
  }

  const statCards = [
    { label: '总需求数', value: stats.totalRequirements, icon: FileText },
    { label: '待评审', value: stats.pendingReview, icon: Clock },
    { label: '测试覆盖率不足', value: stats.lowCoverage, icon: Warning },
    { label: '平均测试覆盖率', value: `${stats.averageCoverage}%`, icon: TrendUp, accent: true },
  ];

  const secondaryCards = [
    { label: '测试用例', value: stats.totalTestCases, sub: `通过率 ${stats.passRate}%`, icon: Flask },
    { label: '自动化率', value: `${stats.automationRate}%`, sub: `${stats.pendingExecution} 个待执行`, icon: Gear },
    { label: '缺陷', value: stats.totalDefects, sub: `${stats.openDefects} 个未关闭`, icon: Bug },
    { label: '测试脚本', value: stats.totalScripts, icon: Code },
  ];

  const coverageBars = [
    { label: '高覆盖率 (≥80%)', value: stats.totalRequirements > 0 ? Math.round((stats.highCoverage / stats.totalRequirements) * 100) : 0, color: 'bg-emerald-500' },
    { label: '中覆盖率 (50-79%)', value: stats.totalRequirements > 0 ? Math.round((stats.midCoverage / stats.totalRequirements) * 100) : 0, color: 'bg-amber-500' },
    { label: '低覆盖率 (<50%)', value: stats.totalRequirements > 0 ? Math.round((stats.lowCoverage / stats.totalRequirements) * 100) : 0, color: 'bg-rose-500' },
  ];

  const qualityTiles = [
    { label: '测试通过率', value: `${stats.passRate}%`, accent: true },
    { label: '自动化率', value: `${stats.automationRate}%` },
    { label: '未关闭缺陷', value: stats.openDefects },
    { label: '待执行用例', value: stats.pendingExecution },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-canvas p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink tracking-tight">仪表盘</h1>
        <p className="text-sm text-muted mt-1">测试需求概览和关键指标</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="card p-5 flex items-center gap-4">
              <Icon size={20} className="text-muted shrink-0" />
              <div className="min-w-0">
                <span className="text-sm text-muted block">{stat.label}</span>
                <span className={`text-2xl font-semibold tnum ${stat.accent ? 'text-accent' : 'text-ink'}`}>{stat.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {secondaryCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="card p-5 flex items-center gap-4">
              <Icon size={20} className="text-muted shrink-0" />
              <div className="min-w-0">
                <span className="text-sm text-muted block">{stat.label}</span>
                <span className="text-2xl font-semibold tnum text-ink">{stat.value}</span>
                {stat.sub && <span className="text-xs text-muted block mt-0.5">{stat.sub}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h3 className="text-base font-semibold text-ink mb-4">覆盖率分布</h3>
          <div className="space-y-3">
            {coverageBars.map((bar, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-ink">{bar.label}</span>
                  <span className="text-muted tnum">{bar.value}%</span>
                </div>
                <div className="w-full bg-surface-2 rounded-full h-1.5">
                  <div className={`${bar.color} h-1.5 rounded-full`} style={{ width: `${Math.min(bar.value, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-base font-semibold text-ink mb-4">测试质量概览</h3>
          <div className="grid grid-cols-2 gap-3">
            {qualityTiles.map((tile, idx) => (
              <div key={idx} className="p-4 bg-surface-2 rounded-lg">
                <div className={`text-3xl font-semibold tnum ${tile.accent ? 'text-accent' : 'text-ink'}`}>{tile.value}</div>
                <div className="text-sm text-muted mt-1">{tile.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
