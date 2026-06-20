import React, { useState, useEffect } from 'react';
import { Code, Plus, Trash, MagnifyingGlass, DownloadSimple, UploadSimple, Sparkle, MagicWand, Robot, X, PaperPlaneTilt } from '@phosphor-icons/react';
import CodeEditor from '../components/CodeEditor';
import { useTestScripts } from '../hooks/useTestScripts';
import { useSettingsContext } from '../hooks/useSettingsContext';
import { useProject } from '../hooks/useProject';
import type { TestScript } from '../../shared/types';

type AIActionType = 'generate' | 'review' | 'explain' | 'optimize' | null;

interface AIActionConfig {
  title: string;
  icon: React.ReactNode;
  placeholder: string;
  defaultPrompt: string;
  type: string;
}

const aiActionConfigs: Record<string, AIActionConfig> = {
  generate: {
    title: 'AI 生成测试脚本',
    icon: <Sparkle size={18} />,
    placeholder: '例如：测试用户登录接口，验证用户名和密码正确时返回 200，错误时返回 401...',
    defaultPrompt: '',
    type: 'TEST_SCRIPT',
  },
  review: {
    title: 'AI 代码审查',
    icon: <MagicWand size={18} />,
    placeholder: '审查要点（可选），例如：重点关注错误处理和边界条件...',
    defaultPrompt: '请对当前代码进行全面审查，指出潜在问题并给出改进建议。',
    type: 'CODE_REVIEW',
  },
  explain: {
    title: 'AI 解释代码',
    icon: <Robot size={18} />,
    placeholder: '想了解哪些部分？（留空则全面解释）',
    defaultPrompt: '请详细解释这段代码的功能、逻辑流程和关键步骤。',
    type: 'EXPLAIN_CODE',
  },
  optimize: {
    title: 'AI 优化代码',
    icon: <MagicWand size={18} />,
    placeholder: '优化方向（可选），例如：提升执行效率、增强可读性、添加更好的错误处理...',
    defaultPrompt: '请优化当前代码，提升性能、可读性和健壮性。',
    type: 'OPTIMIZE_CODE',
  },
};

export const ScriptWorkspacePage: React.FC = () => {
  const { currentProject } = useProject();
  const { scripts, loading, createScript, updateScript, deleteScript } = useTestScripts();
  const { isAIConfigured, settings } = useSettingsContext();
  const [selectedScript, setSelectedScript] = useState<TestScript | null>(null);
  const [searchQuery, setMagnifyingGlassQuery] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  // 关联用例选项（用于自动化覆盖率统计）
  const [testCaseOptions, setTestCaseOptions] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    if (!currentProject?.id) return;
    (window as any).electronAPI?.getTestCases?.(currentProject.id)
      .then((tcs: any[]) => setTestCaseOptions(tcs.map((tc) => ({ id: tc.id, title: tc.title }))))
      .catch(() => setTestCaseOptions([]));
  }, [currentProject?.id]);

  async function handleLinkTestCase(testCaseId: string) {
    if (!selectedScript) return;
    const updated = await updateScript(selectedScript.id, { testCaseId: testCaseId || undefined } as any);
    if (updated) setSelectedScript(updated as any);
    else setSelectedScript({ ...selectedScript, testCaseId: testCaseId || undefined } as any);
  }

  // AI dialog state
  const [activeAction, setActiveAction] = useState<AIActionType>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLanguage, setAiLanguage] = useState('python');

  useEffect(() => {
    if (!loading && scripts.length > 0 && !selectedScript) {
      setSelectedScript(scripts[0]);
    }
  }, [loading, scripts, selectedScript]);

  useEffect(() => {
    if (selectedScript) {
      const stillExists = scripts.find(s => s.id === selectedScript.id);
      if (!stillExists) {
        setSelectedScript(scripts[0] || null);
      } else if (stillExists.code !== selectedScript.code || stillExists.title !== selectedScript.title) {
        setSelectedScript(stillExists);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scripts]);

  const handleFileSelect = (script: TestScript) => {
    setSelectedScript(script);
  };

  const handleSave = async (content: string) => {
    if (selectedScript) {
      try {
        await updateScript(selectedScript.id, { code: content });
      } catch (error) {
        console.error('Failed to save script:', error);
      }
    }
  };

  const handleNewFile = async () => {
    try {
      const count = scripts.length + 1;
      const result = await createScript({
        title: `新建脚本_${count}`,
        language: 'python',
        code: '# 新建测试脚本\n# 开始编写你的测试代码...',
      });
      if (result) {
        setSelectedScript(result);
      }
    } catch (error) {
      console.error('Failed to create script:', error);
    }
  };

  const handleDeleteFile = async (id: string) => {
    if (!confirm('确定要删除此脚本吗？')) return;
    try {
      await deleteScript(id);
      if (selectedScript?.id === id) {
        const remaining = scripts.filter(s => s.id !== id);
        setSelectedScript(remaining[0] || null);
      }
    } catch (error) {
      console.error('Failed to delete script:', error);
    }
  };

  const openAIAction = (action: AIActionType) => {
    if (!isAIConfigured) {
      alert('⚠️ 未配置 API Key，请先在设置中配置 AI 服务');
      return;
    }
    if (!selectedScript && action !== 'generate') {
      alert('请先选择一个脚本文件');
      return;
    }
    setActiveAction(action);
    const config = aiActionConfigs[action!];
    setAiPrompt(config.defaultPrompt);
  };

  const handleAISubmit = async () => {
    if (!activeAction || !selectedScript) return;

    const config = aiActionConfigs[activeAction];
    const prompt = aiPrompt.trim() || config.defaultPrompt;

    if (!prompt) {
      alert('请输入提示词');
      return;
    }

    setAiGenerating(true);
    setStreamingContent('');
    const scriptId = selectedScript.id;

    try {
      const result = await window.electronAPI.generateContent({
        projectId: currentProject?.id,
        aiProvider: settings?.aiProvider,
        type: config.type,
        requirement: {
          title: selectedScript.title,
          code: selectedScript.code,
          language: aiLanguage,
          description: prompt,
        },
      });

      if (result?.content) {
        if (activeAction === 'generate' || activeAction === 'optimize') {
          // Stream the content chunk by chunk into the editor
          const fullContent = result.content;
          // Fewer updates - just show progress in chunks
          const steps = 8;
          const chunkSize = Math.ceil(fullContent.length / steps);
          let accumulated = '';
          let lastUpdate = 0;

          for (let i = 0; i < fullContent.length; i += chunkSize) {
            accumulated = fullContent.substring(0, Math.min(i + chunkSize, fullContent.length));
            const now = Date.now();
            // Update every 150ms - much less flicker
            if (now - lastUpdate > 150 || i + chunkSize >= fullContent.length) {
              setStreamingContent(accumulated);
              lastUpdate = now;
              await new Promise(r => setTimeout(r, 150));
            }
          }

          // Final update: immediately show in editor + persist to DB
          setStreamingContent(fullContent);
          // Directly update selectedScript so Editor shows correct content
          setSelectedScript(prev => prev ? { ...prev, code: fullContent } : prev);
          // Persist to DB in background
          updateScript(scriptId, { code: fullContent });
          setStreamingContent(null);
        } else {
          // review / explain — show in alert
          alert(result.content);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI 生成失败';
      alert(`AI 生成失败: ${msg}`);
      setStreamingContent(null);
    } finally {
      setAiGenerating(false);
      setActiveAction(null);
      setAiPrompt('');
    }
  };

  const filteredScripts = scripts.filter(script =>
    script.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    script.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-slate-200/50 dark:bg-slate-950/50 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">脚本工作区</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">编辑、管理和运行测试脚本</p>
      </div>

      <div className="flex h-[calc(100vh-180px)] gap-6">
        {/* 左侧文件列表 */}
        <div className="w-80 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-200">测试脚本</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => openAIAction('generate')}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-md transition-colors"
                  title="AI 生成脚本"
                >
                  <Sparkle size={16} className="mr-1.5" />
                  AI
                </button>
                <button
                  onClick={handleNewFile}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-md transition-colors"
                >
                  <Plus size={16} className="mr-1.5" />
                  新建
                </button>
              </div>
            </div>

            <div className="relative mb-4">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input
                type="text"
                placeholder="搜索脚本..."
                value={searchQuery}
                onChange={(e) => setMagnifyingGlassQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center text-xs text-slate-600 dark:text-slate-400 mb-2">
              <span>共 {filteredScripts.length} 个文件</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-2">
            {loading ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p>加载中...</p>
              </div>
            ) : filteredScripts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                <Code size={32} className="mx-auto mb-2" />
                <p>{searchQuery ? '未找到匹配的脚本' : '暂无脚本'}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredScripts.map((script) => (
                  <div
                    key={script.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedScript?.id === script.id
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => handleFileSelect(script)}
                  >
                    <div className="flex items-center min-w-0">
                      <Code size={16} className="text-slate-400 dark:text-slate-500 mr-3 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {script.title}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {script.language.toUpperCase()} • {formatDate(script.updatedAt)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(script.id);
                      }}
                      className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => alert('导入功能开发中')}
                className="flex items-center text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-200"
              >
                <UploadSimple size={16} className="mr-2" />
                导入
              </button>
              <button
                onClick={() => alert('导出功能开发中')}
                className="flex items-center text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:text-slate-200"
              >
                <DownloadSimple size={16} className="mr-2" />
                导出全部
              </button>
            </div>
          </div>
        </div>

        {/* 右侧代码编辑器 */}
        <div className="flex-1 min-w-0 flex flex-col">
          {selectedScript ? (
            <>
              {/* AI 工具栏 */}
              <div className="mb-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">AI 助手:</span>
                    {aiGenerating && (
                      <div className="flex items-center text-sm text-purple-600 dark:text-purple-400">
                        <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                        生成中...
                      </div>
                    )}
                    <button
                      onClick={() => openAIAction('generate')}
                      className="flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-900/60 rounded-md transition-colors"
                    >
                      <Sparkle size={14} className="mr-1.5" />
                      生成脚本
                    </button>
                    <button
                      onClick={() => openAIAction('review')}
                      className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 rounded-md transition-colors"
                    >
                      <MagicWand size={14} className="mr-1.5" />
                      代码审查
                    </button>
                    <button
                      onClick={() => openAIAction('explain')}
                      className="flex items-center px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 rounded-md transition-colors"
                    >
                      <Robot size={14} className="mr-1.5" />
                      解释代码
                    </button>
                    <button
                      onClick={() => openAIAction('optimize')}
                      className="flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60 rounded-md transition-colors"
                    >
                      <MagicWand size={14} className="mr-1.5" />
                      优化代码
                    </button>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    基于 AI 的智能代码助手
                  </div>
                </div>
              </div>

              {/* AI 对话面板 */}
              {activeAction && (
                <div className="mb-4 bg-white dark:bg-slate-900 rounded-lg border border-purple-200 dark:border-purple-800 shadow-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center text-purple-700 dark:text-purple-300 font-medium">
                      {aiActionConfigs[activeAction].icon}
                      <span className="ml-2">{aiActionConfigs[activeAction].title}</span>
                    </div>
                    <button
                      onClick={() => { setActiveAction(null); setAiPrompt(''); }}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {activeAction === 'generate' && (
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        目标语言 / 框架
                      </label>
                      <select
                        value={aiLanguage}
                        onChange={(e) => setAiLanguage(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="python-pytest">Python + pytest</option>
                        <option value="python-unittest">Python + unittest</option>
                        <option value="python-playwright">Python + Playwright</option>
                        <option value="python-selenium">Python + Selenium</option>
                        <option value="js-playwright">JavaScript + Playwright</option>
                        <option value="ts-playwright">TypeScript + Playwright</option>
                        <option value="js-cypress">JavaScript + Cypress</option>
                        <option value="ts-cypress">TypeScript + Cypress</option>
                        <option value="java-selenium">Java + Selenium + TestNG</option>
                      </select>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {activeAction === 'generate' ? '描述你要测试什么' : '补充说明（可选）'}
                    </label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={aiActionConfigs[activeAction].placeholder}
                      rows={activeAction === 'generate' ? 3 : 2}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {activeAction === 'generate'
                        ? `将基于 ${selectedScript.title} 的现有代码生成/重写`
                        : `将对 ${selectedScript.title} 进行${aiActionConfigs[activeAction].title.replace('AI ', '')}`}
                    </span>
                    <button
                      onClick={handleAISubmit}
                      disabled={aiGenerating || (activeAction === 'generate' && !aiPrompt.trim())}
                      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      {aiGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          生成中...
                        </>
                      ) : (
                        <>
                          <PaperPlaneTilt size={14} className="mr-2" />
                          发送
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 关联测试用例（驱动自动化覆盖率统计）*/}
              <div className="mb-3 flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-slate-400 shrink-0">关联用例:</span>
                <select
                  value={(selectedScript as any).testCaseId || ''}
                  onChange={(e) => handleLinkTestCase(e.target.value)}
                  className="flex-1 max-w-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">未关联（不计入自动化率）</option>
                  {testCaseOptions.map((tc) => (
                    <option key={tc.id} value={tc.id}>{tc.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-h-0">
                <CodeEditor
                  initialContent={selectedScript.code}
                  value={streamingContent !== null ? streamingContent : undefined}
                  fileName={selectedScript.title}
                  language={selectedScript.language}
                  onSave={handleSave}
                  streaming={aiGenerating}
                />
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="text-center text-slate-400 dark:text-slate-500">
                <Code size={48} className="mx-auto mb-4" />
                <p className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">选择或创建脚本</p>
                <p className="text-sm">从左侧选择脚本文件，或点击"新建"创建新脚本</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
