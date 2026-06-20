'use client';

/**
 * 测试计划页面
 *
 * 创建/编辑测试计划 → 关联需求（多对多）→ 在执行轮次中引用。
 * 复用 zinc+indigo 设计令牌（.card / .input / .status-badge-*）。
 */

import { useEffect, useState } from 'react';
import { useProject } from '@/renderer/hooks/useProject';
import { apiClient } from '@/../lib/api-client';
import { ClipboardText, Plus, CalendarBlank, FileText, Flask, PencilSimple, Trash } from '@phosphor-icons/react';

interface Plan {
  id: string;
  title: string;
  description: string | null;
  strategy: string | null;
  scope: string | null;
  risks: string | null;
  resources: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  _count?: { testCases: number; requirements: number };
}

interface Requirement {
  id: string;
  title: string;
  status: string;
  priority: string;
}

const STATUS_OPTIONS = [
  { value: 'PLANNING', label: '规划中' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'ON_HOLD', label: '已挂起' },
];

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'status-badge-approved';
    case 'IN_PROGRESS': return 'status-badge-in-progress';
    case 'ON_HOLD': return 'status-badge-review';
    default: return 'status-badge-draft';
  }
}

function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
}

const EMPTY_FORM = {
  title: '', description: '', status: 'PLANNING',
  startDate: '', endDate: '', strategy: '', scope: '', risks: '',
};

export default function TestPlansPage() {
  const { currentProject } = useProject();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);

  // 表单（新建 / 编辑共用）
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [selectedReqs, setSelectedReqs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadPlans = () => {
    if (!currentProject?.id) return;
    setLoading(true);
    apiClient.getTestPlans(currentProject.id).then(setPlans).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPlans();
    if (currentProject?.id) {
      apiClient.getRequirements(currentProject.id).then((rs) => setRequirements(rs as any)).catch(() => setRequirements([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setSelectedReqs([]);
    setShowForm(true);
  }

  async function openEdit(plan: Plan) {
    setEditingId(plan.id);
    setForm({
      title: plan.title,
      description: plan.description || '',
      status: plan.status,
      startDate: plan.startDate ? plan.startDate.slice(0, 10) : '',
      endDate: plan.endDate ? plan.endDate.slice(0, 10) : '',
      strategy: plan.strategy || '',
      scope: plan.scope || '',
      risks: plan.risks || '',
    });
    // 拉详情，回显已关联需求
    try {
      const detail = await apiClient.getTestPlan(plan.id);
      setSelectedReqs((detail?.requirements || []).map((r: any) => r.requirementId));
    } catch {
      setSelectedReqs([]);
    }
    setShowForm(true);
  }

  function toggleReq(reqId: string) {
    setSelectedReqs((prev) => prev.includes(reqId) ? prev.filter((id) => id !== reqId) : [...prev, reqId]);
  }

  async function handleSave() {
    if (!form.title.trim() || !currentProject?.id) return;
    setSaving(true);
    try {
      if (editingId) {
        await apiClient.updateTestPlan(editingId, {
          title: form.title.trim(),
          description: form.description || undefined,
          status: form.status as any,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          strategy: form.strategy || undefined,
          scope: form.scope || undefined,
          risks: form.risks || undefined,
        } as any);
        // 同步关联需求差异
        const detail = await apiClient.getTestPlan(editingId);
        const existing: string[] = (detail?.requirements || []).map((r: any) => r.requirementId);
        const toAdd = selectedReqs.filter((id) => !existing.includes(id));
        const toRemove = existing.filter((id) => !selectedReqs.includes(id));
        await Promise.all([
          ...toAdd.map((id) => apiClient.addPlanRequirement(editingId, id)),
          ...toRemove.map((id) => apiClient.removePlanRequirement(editingId, id)),
        ]);
      } else {
        await apiClient.createTestPlan(currentProject.id, {
          title: form.title.trim(),
          description: form.description || undefined,
          status: form.status as any,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          strategy: form.strategy || undefined,
          scope: form.scope || undefined,
          risks: form.risks || undefined,
          requirementIds: selectedReqs,
        } as any);
      }
      setShowForm(false);
      loadPlans();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(plan: Plan) {
    if (!confirm(`确认删除测试计划「${plan.title}」？关联的用例不会被删除。`)) return;
    await apiClient.deleteTestPlan(plan.id);
    loadPlans();
  }

  if (loading && !plans.length) {
    return <div className="p-8 text-muted">加载中…</div>;
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-canvas p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">测试计划</h1>
          <p className="text-sm text-muted mt-1">组织测试范围、周期与策略，关联需求并驱动执行轮次</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-600 transition-colors"
        >
          <Plus size={16} /> 新建计划
        </button>
      </div>

      {/* 计划列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="card p-5 group">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-ink truncate">{plan.title}</h3>
                {plan.description && (
                  <p className="text-xs text-muted mt-1 line-clamp-2">{plan.description}</p>
                )}
              </div>
              <span className={statusBadgeClass(plan.status)}>{statusLabel(plan.status)}</span>
            </div>

            {/* 周期 */}
            {(plan.startDate || plan.endDate) && (
              <div className="flex items-center gap-1.5 text-xs text-muted mb-3">
                <CalendarBlank size={14} />
                <span>
                  {plan.startDate ? plan.startDate.slice(0, 10) : '—'}
                  {' ~ '}
                  {plan.endDate ? plan.endDate.slice(0, 10) : '—'}
                </span>
              </div>
            )}

            {/* 策略摘要 */}
            {plan.strategy && (
              <p className="text-xs text-muted mb-3 line-clamp-2">策略：{plan.strategy}</p>
            )}

            {/* 计数 + 操作 */}
            <div className="flex items-center justify-between pt-3 border-t border-line">
              <div className="flex gap-4 text-sm text-muted">
                <span className="flex items-center gap-1"><FileText size={14} /> {plan._count?.requirements ?? 0} 需求</span>
                <span className="flex items-center gap-1"><Flask size={14} /> {plan._count?.testCases ?? 0} 用例</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(plan)} title="编辑" className="p-1.5 rounded-md text-muted hover:bg-surface-2 hover:text-ink">
                  <PencilSimple size={16} />
                </button>
                <button onClick={() => handleDelete(plan)} title="删除" className="p-1.5 rounded-md text-muted hover:bg-rose-500/10 hover:text-rose-600">
                  <Trash size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {plans.length === 0 && (
          <div className="card p-12 text-center text-muted col-span-full">
            <ClipboardText size={48} className="mx-auto mb-3 opacity-30" />
            <p>暂无测试计划</p>
            <p className="text-sm mt-1">创建第一个测试计划，组织测试范围与周期</p>
          </div>
        )}
      </div>

      {/* 新建 / 编辑弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-ink mb-4">{editingId ? '编辑测试计划' : '新建测试计划'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-ink">计划名称 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="如：v2.0 回归测试计划"
                  className="input mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink">状态</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="input mt-1"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium text-ink">开始</label>
                    <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-ink">结束</label>
                    <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input mt-1" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-ink">描述</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="计划目标、背景…" className="input mt-1" rows={2} />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink">测试策略</label>
                  <textarea value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })} placeholder="测试方法、阶段、准入准出…" className="input mt-1" rows={2} />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink">测试范围</label>
                  <textarea value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="包含/排除的模块…" className="input mt-1" rows={2} />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink">风险评估</label>
                  <textarea value={form.risks} onChange={(e) => setForm({ ...form, risks: e.target.value })} placeholder="已知风险与缓解措施…" className="input mt-1" rows={2} />
                </div>
              </div>

              {/* 关联需求 */}
              <div>
                <label className="text-sm font-medium text-ink">关联需求（{selectedReqs.length} 已选）</label>
                <div className="mt-1 max-h-40 overflow-auto border border-line rounded-lg divide-y divide-line">
                  {requirements.length === 0 && (
                    <p className="px-3 py-2 text-sm text-muted">该项目暂无需求</p>
                  )}
                  {requirements.map((req) => (
                    <label key={req.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={selectedReqs.includes(req.id)}
                        onChange={() => toggleReq(req.id)}
                        className="rounded border-line text-accent focus:ring-accent/40"
                      />
                      <span className="text-ink truncate">{req.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted hover:text-ink">取消</button>
                <button onClick={handleSave} disabled={saving || !form.title.trim()} className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-600 disabled:opacity-50">
                  {saving ? '保存中…' : editingId ? '保存修改' : '创建计划'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
