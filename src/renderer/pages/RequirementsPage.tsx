import React, { useState } from 'react';
import { FileText, Plus, Funnel, X, PencilSimple, Trash, Eye } from '@phosphor-icons/react';
import { PriorityBadge, StatusBadge, CoverageBar } from '../components/PriorityBadge';
import { AttachmentPanel } from '../components/AttachmentPanel';
import { useRequirementsEnhanced } from '../hooks/useRequirementsEnhanced';
import type { Requirement, Priority, RequirementStatus } from '../../shared/types';

export const RequirementsPage: React.FC = () => {
  const {
    requirements,
    loading,
    searchQuery,
    setSearchQuery,
    createRequirement,
    updateRequirement,
    deleteRequirement,
  } = useRequirementsEnhanced();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRequirement, setPencilSimpleingRequirement] = useState<Requirement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<Requirement | null>(null);
  const [showFunnel, setShowFunnel] = useState(false);
  const [filterStatus, setFunnelStatus] = useState('');
  const [filterPriority, setFunnelPriority] = useState('');

  const handleCreate = async (data: any) => {
    await createRequirement(data);
    setShowCreateModal(false);
  };

  const handleUpdate = async (data: any) => {
    if (editingRequirement) {
      await updateRequirement(editingRequirement.id, data);
      setPencilSimpleingRequirement(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除该需求吗？关联的测试用例也将被删除。')) {
      await deleteRequirement(id);
    }
  };

  const filteredRequirements = requirements.filter(r => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterPriority && r.priority !== filterPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-slate-200/50 dark:bg-slate-950/50 p-8">
        <div className="text-center text-slate-500 dark:text-slate-400 dark:text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-slate-200/50 dark:bg-slate-950/50 p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">需求管理</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1">管理产品需求并追踪其测试覆盖率及关联用例。</p>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索需求..."
              className="pl-3 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFunnel(!showFunnel)}
            className={`flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFunnel ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-surface border-line text-muted hover:bg-surface-2'}`}
          >
            <Funnel size={16} className="mr-2" />
            过滤
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            新建需求
          </button>
        </div>
      </div>

      {showFunnel && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 mb-6 flex items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">状态</label>
            <select value={filterStatus} onChange={e => setFunnelStatus(e.target.value)} className="text-sm border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5">
              <option value="">全部</option>
              <option value="DRAFT">草稿</option>
              <option value="REVIEW">待评审</option>
              <option value="IN_PROGRESS">开发/测试中</option>
              <option value="APPROVED">已批准</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">优先级</label>
            <select value={filterPriority} onChange={e => setFunnelPriority(e.target.value)} className="text-sm border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5">
              <option value="">全部</option>
              <option value="LOW">低</option>
              <option value="MEDIUM">中</option>
              <option value="HIGH">高</option>
              <option value="CRITICAL">关键</option>
            </select>
          </div>
          <button onClick={() => { setFunnelStatus(''); setFunnelPriority(''); }} className="mt-5 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300">清除筛选</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: '总需求数', value: requirements.length, color: 'text-slate-800 dark:text-slate-200' },
          { label: '待评审', value: requirements.filter(r => r.status === 'REVIEW').length, color: 'text-amber-600' },
          { label: '覆盖率不足', value: requirements.filter(r => (r.testCoverage || 0) < 50).length, color: 'text-red-600' },
          { label: '平均覆盖率', value: `${requirements.length > 0 ? Math.round(requirements.reduce((s, r) => s + (r.testCoverage || 0), 0) / requirements.length) : 0}%`, color: 'text-emerald-600' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">{stat.label}</span>
            <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider w-24">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider">需求标题</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider w-28">优先级</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider w-36">状态</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider w-40">测试覆盖率</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider w-32">负责人</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right w-32">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRequirements.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group">
                  <td className="px-6 py-4 text-sm font-mono text-slate-500 dark:text-slate-400 dark:text-slate-500">{req.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                    <span className="hover:text-blue-600 cursor-pointer" onClick={() => setShowDetailModal(req)}>{req.title}</span>
                  </td>
                  <td className="px-6 py-4"><PriorityBadge priority={req.priority} /></td>
                  <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                  <td className="px-6 py-4"><CoverageBar coverage={req.testCoverage} /></td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">{req.author}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button onClick={() => setShowDetailModal(req)} title="查看详情" className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => setPencilSimpleingRequirement(req)} title="编辑" className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <PencilSimple size={16} />
                      </button>
                      <button onClick={() => handleDelete(req.id)} title="删除" className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRequirements.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <FileText size={48} className="mx-auto mb-4" />
            <p>暂无需求数据</p>
          </div>
        )}
      </div>

      {(showCreateModal || editingRequirement) && (
        <RequirementFormModal
          requirement={editingRequirement}
          onClose={() => { setShowCreateModal(false); setPencilSimpleingRequirement(null); }}
          onSave={editingRequirement ? handleUpdate : handleCreate}
        />
      )}

      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{showDetailModal.id}</span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{showDetailModal.title}</h3>
              </div>
              <button onClick={() => setShowDetailModal(null)} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">描述</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{showDetailModal.description || '无描述'}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><span className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">优先级</span><div className="mt-1"><PriorityBadge priority={showDetailModal.priority} /></div></div>
                <div><span className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">状态</span><div className="mt-1"><StatusBadge status={showDetailModal.status} /></div></div>
                <div><span className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">覆盖率</span><div className="mt-1"><CoverageBar coverage={showDetailModal.testCoverage} /></div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">负责人</span><p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{showDetailModal.author}</p></div>
                <div><span className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">更新时间</span><p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{showDetailModal.updatedAt ? new Date(showDetailModal.updatedAt).toLocaleDateString('zh-CN') : '-'}</p></div>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <AttachmentPanel targetType="Requirement" targetId={showDetailModal.id} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface RequirementFormModalProps {
  requirement?: Requirement | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

const RequirementFormModal: React.FC<RequirementFormModalProps> = ({ requirement, onClose, onSave }) => {
  const isPencilSimple = !!requirement;
  const [formData, setFormData] = useState({
    title: requirement?.title || '',
    description: requirement?.description || '',
    priority: (requirement?.priority || 'MEDIUM') as Priority,
    status: (requirement?.status || 'DRAFT') as RequirementStatus,
    author: requirement?.author || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">{isPencilSimple ? '编辑需求' : '创建新需求'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">需求标题</label>
            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">需求描述</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">优先级</label>
              <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40">
                <option value="LOW">低</option>
                <option value="MEDIUM">中</option>
                <option value="HIGH">高</option>
                <option value="CRITICAL">关键</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">状态</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as RequirementStatus })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40">
                <option value="DRAFT">草稿</option>
                <option value="REVIEW">待评审</option>
                <option value="IN_PROGRESS">开发/测试中</option>
                <option value="APPROVED">已批准</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">负责人</label>
            <input type="text" value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40" required />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200">取消</button>
            <button type="submit" className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90">{isPencilSimple ? '保存' : '创建'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
