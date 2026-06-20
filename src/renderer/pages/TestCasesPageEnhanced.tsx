import React, { useState } from 'react';
import {
  Flask, Plus, Funnel, Sparkle, CheckCircle, XCircle, Clock,
  Play, Copy, PencilSimple, Trash, DownloadSimple, UploadSimple, Stack, Target, Lightning, Shield, Users, Globe, X, Spinner
} from '@phosphor-icons/react';
import type { TestCase, Priority, TestCaseStatus, TestCaseCategory } from '../../shared/types';
import { useTestCases } from '../hooks/useTestCases';
import { useSettingsContext } from '../hooks/useSettingsContext';
import { useProject } from '../hooks/useProject';
import { AttachmentPanel } from '../components/AttachmentPanel';

const CATEGORY_LABELS: Record<TestCaseCategory, string> = {
  FUNCTIONAL: '功能',
  PERFORMANCE: '性能',
  SECURITY: '安全',
  USABILITY: '可用性',
  COMPATIBILITY: '兼容性',
  REGRESSION: '回归',
  SMOKE: '冒烟',
  E2E: '端到端',
};

const STATUS_LABELS: Record<TestCaseStatus, string> = {
  PENDING: '待执行',
  PASS: '通过',
  FAIL: '失败',
  BLOCKED: '阻塞',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
  CRITICAL: '关键',
};

const emptyForm: FormState = {
  title: '',
  description: '',
  preconditions: '',
  stepsText: '',
  expectedResult: '',
  priority: 'MEDIUM',
  status: 'PENDING',
  category: 'FUNCTIONAL',
  automated: false,
  author: '',
  requirementId: '',
};

interface FormState {
  title: string;
  description: string;
  preconditions: string;
  stepsText: string;
  expectedResult: string;
  priority: Priority;
  status: TestCaseStatus;
  category: TestCaseCategory;
  automated: boolean;
  author: string;
  requirementId: string;
}

export const TestCasesPageEnhanced: React.FC = () => {
  const { currentProject } = useProject();
  const { testCases, loading, createTestCase, updateTestCase, deleteTestCase } = useTestCases();
  const { isAIConfigured, settings } = useSettingsContext();
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiGeneratedContent, setAiGeneratedContent] = useState('');

  const [filterOpen, setFunnelOpen] = useState(false);
  const [filter, setFunnel] = useState({ status: '', category: '', priority: '' });
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setPencilSimpleingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // ---------- helpers ----------

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const openCreate = () => {
    setPencilSimpleingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openPencilSimple = (tc: TestCase) => {
    setPencilSimpleingId(tc.id);
    setForm({
      title: tc.title,
      description: tc.description || '',
      preconditions: tc.preconditions || '',
      stepsText: (tc.steps || []).join('\n'),
      expectedResult: tc.expectedResult,
      priority: tc.priority,
      status: tc.status,
      category: tc.category,
      automated: tc.automated,
      author: tc.author || '',
      requirementId: tc.requirementId || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const steps = form.stepsText.split('\n').map(s => s.trim()).filter(Boolean);
    const data: Partial<TestCase> = {
      title: form.title,
      description: form.description,
      preconditions: form.preconditions,
      steps,
      expectedResult: form.expectedResult,
      priority: form.priority,
      status: form.status,
      category: form.category,
      automated: form.automated,
      author: form.author,
      requirementId: form.requirementId,
    };
    try {
      if (editingId) {
        await updateTestCase(editingId, data);
      } else {
        await createTestCase(data);
      }
      setModalOpen(false);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除该测试用例？此操作不可撤销。')) return;
    try {
      await deleteTestCase(id);
      setSelectedCases(prev => prev.filter(s => s !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleCopy = async (tc: TestCase) => {
    try {
      await createTestCase({
        title: tc.title + ' (副本)',
        description: tc.description,
        preconditions: tc.preconditions,
        steps: tc.steps,
        expectedResult: tc.expectedResult,
        priority: tc.priority,
        status: 'PENDING',
        category: tc.category,
        automated: tc.automated,
        author: tc.author,
        requirementId: tc.requirementId,
      });
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleAIGenerate = async () => {
    if (!isAIConfigured) {
      alert('⚠️ AI 功能需要配置 API Key，请先前往项目设置页面配置 API Key');
      return;
    }

    setIsGenerating(true);
    setAiPanelOpen(true);
    setAiGeneratedContent('');

    try {
      const result = await window.electronAPI.generateContent({
        projectId: currentProject?.id,
        aiProvider: settings?.aiProvider || 'OPENAI',
        type: 'TEST_CASE',
        requirement: { title: '生成测试用例', description: '根据项目需求生成全面的测试用例' },
      });

      if (result?.content) {
        setAiGeneratedContent(result.content);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      alert('AI 生成失败: ' + (error instanceof Error ? error.message : '请稍后重试'));
      setAiPanelOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptAIGenerated = async () => {
    if (!aiGeneratedContent) return;

    try {
      // 尝试解析 AI 生成的 JSON 格式测试用例
      let testCasesData: any[] = [];
      try {
        const parsed = JSON.parse(aiGeneratedContent);
        testCasesData = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // 如果不是 JSON，创建一个通用测试用例
        testCasesData = [{
          title: 'AI 生成的测试用例',
          description: aiGeneratedContent,
          preconditions: '',
          steps: ['待补充'],
          expectedResult: '待补充',
          priority: 'MEDIUM',
          category: 'FUNCTIONAL',
        }];
      }

      // 批量创建测试用例
      for (const tc of testCasesData) {
        await createTestCase({
          title: tc.title || 'AI 生成的测试用例',
          description: tc.description || '',
          preconditions: tc.preconditions || '',
          steps: tc.steps || [],
          expectedResult: tc.expectedResult || '',
          priority: tc.priority || 'MEDIUM',
          status: 'PENDING',
          category: tc.category || 'FUNCTIONAL',
          automated: false,
          author: 'AI 生成',
        });
      }

      alert(`✅ 成功创建 ${testCasesData.length} 个测试用例`);
      setAiPanelOpen(false);
      setAiGeneratedContent('');
    } catch (error) {
      console.error('Failed to create test cases:', error);
      alert('创建测试用例失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleRejectAI = () => {
    setAiPanelOpen(false);
    setAiGeneratedContent('');
  };

  // ---------- badge renderers ----------

  const getStatusBadge = (status: TestCaseStatus) => {
    const styles: Record<TestCaseStatus, { bg: string; text: string; icon: React.ReactNode }> = {
      PENDING: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-200', icon: <Clock size={12} /> },
      PASS: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <CheckCircle size={12} /> },
      FAIL: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle size={12} /> },
      BLOCKED: { bg: 'bg-amber-100', text: 'text-amber-800', icon: <Clock size={12} /> },
    };
    const s = styles[status] || styles.PENDING;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center ${s.bg} ${s.text}`}>
        <span className="mr-1">{s.icon}</span>
        {STATUS_LABELS[status] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority: Priority) => {
    const styles: Record<Priority, string> = {
      LOW: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-amber-100 text-amber-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[priority]}`}>
        {PRIORITY_LABELS[priority]}
      </span>
    );
  };

  const getCategoryIcon = (category: TestCaseCategory) => {
    const icons: Record<TestCaseCategory, React.ReactNode> = {
      FUNCTIONAL: <Flask size={14} />,
      PERFORMANCE: <Lightning size={14} />,
      SECURITY: <Shield size={14} />,
      USABILITY: <Users size={14} />,
      COMPATIBILITY: <Globe size={14} />,
      REGRESSION: <Stack size={14} />,
      SMOKE: <Target size={14} />,
      E2E: <Play size={14} />,
    };
    return icons[category] || <Flask size={14} />;
  };

  // ---------- filtering ----------

  const filteredCases = testCases.filter(tc => {
    if (filter.status && tc.status !== filter.status) return false;
    if (filter.category && tc.category !== filter.category) return false;
    if (filter.priority && tc.priority !== filter.priority) return false;
    return true;
  });

  // ---------- stats ----------

  const total = testCases.length;
  const executed = testCases.filter(c => c.status !== 'PENDING').length;
  const passed = testCases.filter(c => c.status === 'PASS').length;
  const automated = testCases.filter(c => c.automated).length;
  const pending = testCases.filter(c => c.status === 'PENDING').length;
  const passRate = executed > 0 ? Math.round((passed / executed) * 100) : 0;
  const autoRate = total > 0 ? Math.round((automated / total) * 100) : 0;

  // ---------- render ----------

  if (loading) {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-slate-200/50 dark:bg-slate-950/50 p-8">
        <div className="text-center text-slate-600 dark:text-slate-400">加载测试用例中...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-slate-200/50 dark:bg-slate-950/50 p-8">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">测试用例管理</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">创建、执行和跟踪测试用例，确保软件质量。</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleAIGenerate}
            className="flex items-center px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-100 transition-colors shadow-sm"
          >
            <Sparkle size={16} className="mr-2" />
            AI 生成用例
          </button>
          <button
            onClick={() => setFunnelOpen(v => !v)}
            className={`flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm ${filterOpen ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <Funnel size={16} className="mr-2" />
            过滤
          </button>
          <button
            onClick={openCreate}
            className="flex items-center px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            新建用例
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">总用例数</span>
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{total}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">通过率</span>
          <span className="text-2xl font-bold text-emerald-600">{passRate}%</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">自动化率</span>
          <span className="text-2xl font-bold text-blue-600">{autoRate}%</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">未执行</span>
          <span className="text-2xl font-bold text-amber-600">{pending}</span>
        </div>
      </div>

      {/* Funnels */}
      {filterOpen && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">状态</label>
              <select
                value={filter.status}
                onChange={e => setFunnel({ ...filter, status: e.target.value })}
                className="text-sm border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1"
              >
                <option value="">全部</option>
                {(Object.keys(STATUS_LABELS) as TestCaseStatus[]).map(k => (
                  <option key={k} value={k}>{STATUS_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">类别</label>
              <select
                value={filter.category}
                onChange={e => setFunnel({ ...filter, category: e.target.value })}
                className="text-sm border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1"
              >
                <option value="">全部</option>
                {(Object.keys(CATEGORY_LABELS) as TestCaseCategory[]).map(k => (
                  <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">优先级</label>
              <select
                value={filter.priority}
                onChange={e => setFunnel({ ...filter, priority: e.target.value })}
                className="text-sm border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1"
              >
                <option value="">全部</option>
                {(Object.keys(PRIORITY_LABELS) as Priority[]).map(k => (
                  <option key={k} value={k}>{PRIORITY_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div className="flex-1" />
            <div className="flex items-center space-x-2">
              <button className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600">
                <DownloadSimple size={16} />
              </button>
              <button className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600">
                <UploadSimple size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-200 dark:bg-slate-800/80 border-b border-slate-300 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={selectedCases.length === filteredCases.length && filteredCases.length > 0}
                    onChange={e => setSelectedCases(e.target.checked ? filteredCases.map(c => c.id) : [])}
                    className="rounded border-slate-300 dark:border-slate-600"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-24">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">测试用例标题</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-28">优先级</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-32">状态</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-36">类别</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider w-28">自动化</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right w-32">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCases.map(tc => (
                <tr key={tc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedCases.includes(tc.id)}
                      onChange={e => setSelectedCases(prev => e.target.checked ? [...prev, tc.id] : prev.filter(id => id !== tc.id))}
                      className="rounded border-slate-300 dark:border-slate-600"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">{tc.id}</td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{tc.title}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{tc.description}</div>
                      {tc.lastExecuted && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          最后执行: {new Date(tc.lastExecuted).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">{getPriorityBadge(tc.priority)}</td>
                  <td className="px-6 py-4">{getStatusBadge(tc.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="mr-2 text-slate-400 dark:text-slate-500">{getCategoryIcon(tc.category)}</span>
                      <span className="text-sm text-slate-600 dark:text-slate-300">{CATEGORY_LABELS[tc.category] || tc.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {tc.automated ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <Play size={10} className="mr-1" /> 自动化
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        手动
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={handleAIGenerate}
                        title="AI 生成类似用例"
                        className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                      >
                        <Sparkle size={16} />
                      </button>
                      <button
                        onClick={() => handleCopy(tc)}
                        title="复制"
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => openPencilSimple(tc)}
                        title="编辑"
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <PencilSimple size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(tc.id)}
                        title="删除"
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCases.length === 0 && (
          <div className="text-center py-8 text-slate-600 dark:text-slate-400">
            <Flask size={32} className="mx-auto mb-2 text-slate-300" />
            <p>没有找到匹配的测试用例</p>
          </div>
        )}
      </div>

      {/* Create / PencilSimple Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold">{editingId ? '编辑测试用例' : '新建测试用例'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">标题 *</label>
                <input
                  value={form.title}
                  onChange={e => updateForm('title', e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入测试用例标题"
                />
              </div>

              {/* description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">描述</label>
                <textarea
                  value={form.description}
                  onChange={e => updateForm('description', e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="测试用例描述"
                />
              </div>

              {/* preconditions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">前置条件</label>
                <textarea
                  value={form.preconditions}
                  onChange={e => updateForm('preconditions', e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="执行前需要满足的条件"
                />
              </div>

              {/* steps */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">测试步骤（每行一步）</label>
                <textarea
                  value={form.stepsText}
                  onChange={e => updateForm('stepsText', e.target.value)}
                  rows={4}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={"1. 打开页面\n2. 输入数据\n3. 点击提交"}
                />
              </div>

              {/* expected result */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">预期结果 *</label>
                <textarea
                  value={form.expectedResult}
                  onChange={e => updateForm('expectedResult', e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="期望的输出或行为"
                />
              </div>

              {/* row: priority, status, category */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">优先级</label>
                  <select
                    value={form.priority}
                    onChange={e => updateForm('priority', e.target.value as Priority)}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm"
                  >
                    {(Object.keys(PRIORITY_LABELS) as Priority[]).map(k => (
                      <option key={k} value={k}>{PRIORITY_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">状态</label>
                  <select
                    value={form.status}
                    onChange={e => updateForm('status', e.target.value as TestCaseStatus)}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm"
                  >
                    {(Object.keys(STATUS_LABELS) as TestCaseStatus[]).map(k => (
                      <option key={k} value={k}>{STATUS_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">类别</label>
                  <select
                    value={form.category}
                    onChange={e => updateForm('category', e.target.value as TestCaseCategory)}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm"
                  >
                    {(Object.keys(CATEGORY_LABELS) as TestCaseCategory[]).map(k => (
                      <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* row: automated, author */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center pt-6">
                  <input
                    id="automated"
                    type="checkbox"
                    checked={form.automated}
                    onChange={e => updateForm('automated', e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 mr-2"
                  />
                  <label htmlFor="automated" className="text-sm font-medium text-slate-700 dark:text-slate-300">自动化测试</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">作者</label>
                  <input
                    value={form.author}
                    onChange={e => updateForm('author', e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="测试人员姓名"
                  />
                </div>
              </div>

              {/* requirementId */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">关联需求 ID</label>
                <input
                  value={form.requirementId}
                  onChange={e => updateForm('requirementId', e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="REQ-xxxx"
                />
              </div>

              {/* 附件（仅编辑已存在用例时可用）*/}
              {editingId && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <AttachmentPanel targetType="TestCase" targetId={editingId} />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || !form.expectedResult.trim()}
                className="px-4 py-2 text-sm text-white bg-accent rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? '保存修改' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch selection bar */}
      {selectedCases.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white rounded-lg px-4 py-3 shadow-lg flex items-center space-x-4">
          <span className="text-sm">已选择 {selectedCases.length} 个测试用例</span>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-slate-700 rounded text-sm hover:bg-slate-600">批量执行</button>
            <button className="px-3 py-1 bg-accent rounded text-sm hover:bg-accent/90">导出</button>
            <button
              onClick={async () => {
                if (!window.confirm(`确定删除选中的 ${selectedCases.length} 个测试用例？`)) return;
                for (const id of selectedCases) {
                  await deleteTestCase(id);
                }
                setSelectedCases([]);
              }}
              className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
            >
              删除
            </button>
          </div>
        </div>
      )}

      {/* AI Generation Panel */}
      {aiPanelOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-surface-2">
              <div className="flex items-center gap-2">
                <Sparkle className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">AI 生成测试用例</span>
                {isGenerating && (
                  <span className="text-sm text-purple-600 animate-pulse">生成中...</span>
                )}
              </div>
              <button
                onClick={handleRejectAI}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isGenerating ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  <div className="text-center">
                    <Spinner className="w-10 h-10 animate-spin mx-auto mb-3 text-purple-600" />
                    <p className="text-sm">AI 正在生成测试用例...</p>
                    <p className="text-xs text-slate-400 mt-1">这可能需要几秒钟</p>
                  </div>
                </div>
              ) : aiGeneratedContent ? (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 dark:text-slate-300">
                    {aiGeneratedContent}
                  </pre>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  <p>等待生成...</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {aiGeneratedContent && !isGenerating && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <button
                  onClick={handleRejectAI}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  放弃
                </button>
                <button
                  onClick={handleAcceptAIGenerated}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  采纳并创建用例
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
