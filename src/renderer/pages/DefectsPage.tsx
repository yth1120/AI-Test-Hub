import React, { useState } from 'react';
import { Bug, Plus, Funnel, PencilSimple, Trash, Eye, X, WarningCircle, CheckCircle, Clock } from '@phosphor-icons/react';
import { useDefects } from '../hooks/useDefects';
import { AttachmentPanel } from '../components/AttachmentPanel';
import type { Defect, Priority, DefectSeverity, DefectStatus, DefectType } from '../../shared/types';

const severityBadge: Record<DefectSeverity, string> = {
  LOW: 'bg-slate-100 text-slate-600 dark:text-slate-300',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const statusBadge: Record<DefectStatus, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600 dark:text-slate-300',
  REOPENED: 'bg-orange-100 text-orange-700',
};

const priorityBadge: Record<Priority, string> = {
  LOW: 'bg-slate-100 text-slate-600 dark:text-slate-300',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

const severityLabel: Record<DefectSeverity, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  CRITICAL: '严重',
};

const statusLabel: Record<DefectStatus, string> = {
  OPEN: '未解决',
  IN_PROGRESS: '处理中',
  RESOLVED: '已解决',
  CLOSED: '已关闭',
  REOPENED: '重新打开',
};

const priorityLabel: Record<Priority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  CRITICAL: '关键',
};

const typeLabel: Record<DefectType, string> = {
  BUG: '缺陷',
  IMPROVEMENT: '改进',
  TASK: '任务',
};

const statusOptions: { value: DefectStatus; label: string }[] = [
  { value: 'OPEN', label: '未解决' },
  { value: 'IN_PROGRESS', label: '处理中' },
  { value: 'RESOLVED', label: '已解决' },
  { value: 'CLOSED', label: '已关闭' },
  { value: 'REOPENED', label: '重新打开' },
];

const inlineStatusOptions = [
  { value: 'IN_PROGRESS', label: '标记为处理中' },
  { value: 'RESOLVED', label: '标记为已解决' },
  { value: 'CLOSED', label: '标记为已关闭' },
  { value: 'REOPENED', label: '重新打开' },
];

const Badge: React.FC<{ className: string; children: React.ReactNode }> = ({ className, children }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

export const DefectsPage: React.FC = () => {
  const { defects, loading, createDefect, updateDefect, deleteDefect } = useDefects();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFunnel, setShowFunnel] = useState(false);
  const [filterStatus, setFunnelStatus] = useState('');
  const [filterSeverity, setFunnelSeverity] = useState('');
  const [filterPriority, setFunnelPriority] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDefect, setPencilSimpleingDefect] = useState<Defect | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<Defect | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);

  const handleCreate = async (data: Partial<Defect>) => {
    await createDefect(data);
    setShowCreateModal(false);
  };

  const handleUpdate = async (data: Partial<Defect>) => {
    if (editingDefect) {
      await updateDefect(editingDefect.id, data);
      setPencilSimpleingDefect(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除该缺陷吗？此操作不可撤销。')) {
      await deleteDefect(id);
    }
  };

  const handleQuickStatusChange = async (id: string, status: DefectStatus) => {
    await updateDefect(id, { status });
    setStatusMenuId(null);
  };

  const filteredDefects = defects.filter(d => {
    if (filterStatus && d.status !== filterStatus) return false;
    if (filterSeverity && d.severity !== filterSeverity) return false;
    if (filterPriority && d.priority !== filterPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return d.title.toLowerCase().includes(q) || d.id.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-slate-200/50 dark:bg-slate-950/50 p-8">
        <div className="text-center text-slate-600 dark:text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-slate-200/50 dark:bg-slate-950/50 p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">缺陷跟踪</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">跟踪和管理测试缺陷</p>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索缺陷..."
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
            新建缺陷
          </button>
        </div>
      </div>

      {showFunnel && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">状态</label>
            <select value={filterStatus} onChange={e => setFunnelStatus(e.target.value)} className="text-sm border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5">
              <option value="">全部</option>
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">严重程度</label>
            <select value={filterSeverity} onChange={e => setFunnelSeverity(e.target.value)} className="text-sm border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5">
              <option value="">全部</option>
              <option value="LOW">低</option>
              <option value="MEDIUM">中</option>
              <option value="HIGH">高</option>
              <option value="CRITICAL">严重</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">优先级</label>
            <select value={filterPriority} onChange={e => setFunnelPriority(e.target.value)} className="text-sm border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5">
              <option value="">全部</option>
              <option value="LOW">低</option>
              <option value="MEDIUM">中</option>
              <option value="HIGH">高</option>
              <option value="CRITICAL">关键</option>
            </select>
          </div>
          <button onClick={() => { setFunnelStatus(''); setFunnelSeverity(''); setFunnelPriority(''); }} className="mt-5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300">清除筛选</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: '总缺陷数', value: defects.length, icon: <WarningCircle size={20} className="text-slate-400 dark:text-slate-500" />, color: 'text-slate-800 dark:text-slate-200' },
          { label: '未关闭', value: defects.filter(d => d.status !== 'CLOSED').length, icon: <Clock size={20} className="text-orange-400" />, color: 'text-orange-600' },
          { label: '已解决', value: defects.filter(d => d.status === 'RESOLVED' || d.status === 'CLOSED').length, icon: <CheckCircle size={20} className="text-green-400" />, color: 'text-green-600' },
          { label: '严重缺陷', value: defects.filter(d => d.severity === 'CRITICAL').length, icon: <WarningCircle size={20} className="text-red-400" />, color: 'text-red-600' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">{stat.icon}</div>
            <div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.label}</span>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-200 dark:bg-slate-800/80 border-b border-slate-300 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-24">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">缺陷标题</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-28">严重程度</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-28">优先级</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-36">状态</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-32">负责人</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right w-40">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDefects.map(defect => (
                <tr key={defect.id} className="hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800/80 transition-colors group">
                  <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">{defect.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800 dark:text-slate-200">
                    <span className="hover:text-blue-600 cursor-pointer" onClick={() => setShowDetailModal(defect)}>{defect.title}</span>
                  </td>
                  <td className="px-6 py-4"><Badge className={severityBadge[defect.severity]}>{severityLabel[defect.severity]}</Badge></td>
                  <td className="px-6 py-4"><Badge className={priorityBadge[defect.priority]}>{priorityLabel[defect.priority]}</Badge></td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block">
                      <button onClick={() => setStatusMenuId(statusMenuId === defect.id ? null : defect.id)} className="cursor-pointer">
                        <Badge className={statusBadge[defect.status]}>{statusLabel[defect.status]}</Badge>
                      </button>
                      {statusMenuId === defect.id && (
                        <div className="absolute z-20 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 w-40">
                          {inlineStatusOptions.filter(o => o.value !== defect.status).map(o => (
                            <button
                              key={o.value}
                              onClick={() => handleQuickStatusChange(defect.id, o.value as DefectStatus)}
                              className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-800"
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{defect.assignee || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button onClick={() => setShowDetailModal(defect)} title="查看详情" className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <Eye size={16} />
                      </button>
                      <button onClick={() => setPencilSimpleingDefect(defect)} title="编辑" className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                        <PencilSimple size={16} />
                      </button>
                      <button onClick={() => handleDelete(defect.id)} title="删除" className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredDefects.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
            <Bug size={48} className="mx-auto mb-4" />
            <p>暂无缺陷数据</p>
          </div>
        )}
      </div>

      {(showCreateModal || editingDefect) && (
        <DefectFormModal
          defect={editingDefect}
          onClose={() => { setShowCreateModal(false); setPencilSimpleingDefect(null); }}
          onSave={editingDefect ? handleUpdate : handleCreate}
        />
      )}

      {showDetailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailModal(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{showDetailModal.id.slice(0, 8)}</span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{showDetailModal.title}</h3>
              </div>
              <button onClick={() => setShowDetailModal(null)} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">描述</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{showDetailModal.description || '无描述'}</p>
              </div>
              {showDetailModal.steps && (
                <div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">复现步骤</span>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{showDetailModal.steps}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">严重程度</span><div className="mt-1"><Badge className={severityBadge[showDetailModal.severity]}>{severityLabel[showDetailModal.severity]}</Badge></div></div>
                <div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">优先级</span><div className="mt-1"><Badge className={priorityBadge[showDetailModal.priority]}>{priorityLabel[showDetailModal.priority]}</Badge></div></div>
                <div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">状态</span><div className="mt-1"><Badge className={statusBadge[showDetailModal.status]}>{statusLabel[showDetailModal.status]}</Badge></div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">类型</span><p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{typeLabel[showDetailModal.type]}</p></div>
                <div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">负责人</span><p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{showDetailModal.assignee || '-'}</p></div>
                <div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">报告人</span><p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{showDetailModal.reporter || '-'}</p></div>
                <div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">环境</span><p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{showDetailModal.environment || '-'}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">创建时间</span><p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{showDetailModal.createdAt ? new Date(showDetailModal.createdAt).toLocaleDateString('zh-CN') : '-'}</p></div>
                <div><span className="text-sm font-medium text-slate-600 dark:text-slate-400">更新时间</span><p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{showDetailModal.updatedAt ? new Date(showDetailModal.updatedAt).toLocaleDateString('zh-CN') : '-'}</p></div>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <AttachmentPanel targetType="Defect" targetId={showDetailModal.id} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface DefectFormModalProps {
  defect?: Defect | null;
  onClose: () => void;
  onSave: (data: Partial<Defect>) => void;
}

const DefectFormModal: React.FC<DefectFormModalProps> = ({ defect, onClose, onSave }) => {
  const isPencilSimple = !!defect;
  const [formData, setFormData] = useState({
    title: defect?.title || '',
    description: defect?.description || '',
    steps: defect?.steps || '',
    severity: (defect?.severity || 'MEDIUM') as DefectSeverity,
    priority: (defect?.priority || 'MEDIUM') as Priority,
    status: (defect?.status || 'OPEN') as DefectStatus,
    type: (defect?.type || 'BUG') as DefectType,
    reporter: defect?.reporter || '',
    assignee: defect?.assignee || '',
    environment: defect?.environment || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{isPencilSimple ? '编辑缺陷' : '创建新缺陷'}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">缺陷标题</label>
            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">描述</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">复现步骤</label>
            <textarea value={formData.steps} onChange={e => setFormData({ ...formData, steps: e.target.value })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40" rows={3} placeholder="1. 打开页面&#10;2. 点击按钮&#10;3. 观察结果" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">严重程度</label>
              <select value={formData.severity} onChange={e => setFormData({ ...formData, severity: e.target.value as DefectSeverity })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40">
                <option value="LOW">低</option>
                <option value="MEDIUM">中</option>
                <option value="HIGH">高</option>
                <option value="CRITICAL">严重</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">优先级</label>
              <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40">
                <option value="LOW">低</option>
                <option value="MEDIUM">中</option>
                <option value="HIGH">高</option>
                <option value="CRITICAL">关键</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">状态</label>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as DefectStatus })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40">
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">类型</label>
              <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as DefectType })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40">
                <option value="BUG">缺陷</option>
                <option value="IMPROVEMENT">改进</option>
                <option value="TASK">任务</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">报告人</label>
              <input type="text" value={formData.reporter} onChange={e => setFormData({ ...formData, reporter: e.target.value })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">负责人</label>
              <input type="text" value={formData.assignee} onChange={e => setFormData({ ...formData, assignee: e.target.value })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">环境</label>
            <input type="text" value={formData.environment} onChange={e => setFormData({ ...formData, environment: e.target.value })} className="w-full px-3 py-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40" placeholder="例: Chrome 120, Windows 11" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 rounded-md hover:bg-slate-200">取消</button>
            <button type="submit" className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90">{isPencilSimple ? '保存' : '创建'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
