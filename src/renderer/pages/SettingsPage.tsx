import React, { useState, useEffect } from 'react';
import { Key, Robot, Sparkle, MagicWand, Globe } from '@phosphor-icons/react';
import { useProjectSettings } from '../hooks/useProjectSettings';
import { useSettingsContext } from '../hooks/useSettingsContext';
import { useProject } from '../hooks/useProject';
import { MemberManagement } from '../components/MemberManagement';
import type { AIProvider } from '../../shared/types';

export const SettingsPage: React.FC = () => {
  const { currentProject } = useProject();
  const { settings, saveSettings, testConnection } = useProjectSettings();
  const { isAIConfigured, reload: reloadGlobalSettings } = useSettingsContext();
  const [aiProvider, setAiProvider] = useState<AIProvider>('OPENAI');
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // Model configuration
  const [model, setModel] = useState('');
  const [maxTokens, setMaxTokens] = useState(2000);
  const [temperature, setTemperature] = useState(0.7);
  const [enableStreaming, setEnableStreaming] = useState(true);
  // System prompts
  const [systemPromptTestPlan, setSystemPromptTestPlan] = useState('');
  const [systemPromptTestCase, setSystemPromptTestCase] = useState('');
  const [systemPromptScript, setSystemPromptScript] = useState('');

  useEffect(() => {
    if (settings) {
      setAiProvider(settings.aiProvider);
      // Use apiKey from settings object directly (already loaded from keychain by get-project-settings)
      setApiKey(settings.apiKey || '');
      setModel(settings.model || '');
      setMaxTokens(settings.maxTokens || 2000);
      setTemperature(settings.temperature || 0.7);
      setEnableStreaming(settings.enableStreaming ?? true);
      setSystemPromptTestPlan(settings.systemPromptTestPlan || '');
      setSystemPromptTestCase(settings.systemPromptTestCase || '');
      setSystemPromptScript(settings.systemPromptScript || '');
      // If we have an API key, consider it configured
      // (global isAIConfigured from SettingsContext will update automatically)
    }
  }, [settings]);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      alert('请输入 API Key');
      return;
    }

    setIsConnecting(true);
    try {
      // Save API key first (this will persist to keychain via save-project-settings)
      await saveSettings({
        aiProvider,
        apiKey,
        model,
        maxTokens,
        temperature,
        enableStreaming,
        systemPromptTestPlan,
        systemPromptTestCase,
        systemPromptScript,
      });
      // Sync global SettingsContext so other pages see the updated API key
      await reloadGlobalSettings();

      // Test connection using actual AI service
      const connected = await testConnection(apiKey, aiProvider);

      if (connected) {
        alert('✅ 连接成功！AI 服务配置正确。');
      } else {
        alert('❌ 连接失败，请检查 API Key 和网络设置。');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      alert('连接测试失败：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await saveSettings({
        aiProvider,
        apiKey,
        model,
        maxTokens,
        temperature,
        enableStreaming,
        systemPromptTestPlan,
        systemPromptTestCase,
        systemPromptScript,
      });
      // Sync global SettingsContext so other pages see the updated API key
      await reloadGlobalSettings();
      alert('✅ 设置已保存！');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('保存失败：' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  const handleAIGenerate = async (targetName: string) => {
    if (!isAIConfigured) {
      alert('⚠️ 请先配置 API Key 并测试连接！');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await window.electronAPI.generateContent({
        projectId: currentProject?.id,
        aiProvider,
        type: 'TEST_PLAN',
        requirement: { title: targetName },
      });
      if (result?.content) {
        alert(`✨ AI 生成成功！已为您自动生成：\n\n${targetName}\n\n（内容已生成，可在对应模块查看）`);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      alert('AI 生成失败: ' + (error instanceof Error ? error.message : '请稍后重试'));
    } finally {
      setIsGenerating(false);
    }
  };

  const providerOptions: { value: AIProvider; label: string; baseUrl: string }[] = [
    { value: 'OPENAI', label: 'OpenAI（ChatGPT）', baseUrl: 'https://api.openai.com' },
    { value: 'ANTHROPIC', label: 'Anthropic（Claude）', baseUrl: 'https://api.anthropic.com' },
    { value: 'GOOGLE', label: 'Google （Gemini）', baseUrl: 'https://generativelanguage.googleapis.com' },
    { value: 'DEEPSEEK', label: '深度求索（DeepSeek）', baseUrl: 'https://api.deepseek.com' },
    { value: 'KIMI', label: 'Moonshot（Kimi）', baseUrl: 'https://api.moonshot.cn' },
    { value: 'QWEN', label: '通义千问（Qwen）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-slate-200/50 dark:bg-slate-950/50 p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">项目设置与 AI 配置</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">配置大语言模型（LLM）API 以启用自动化需求分析、用例生成和脚本编写。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI 配置面板 */}
        <div className="col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center mb-6">
            <Key className="text-blue-600 mr-2" size={20} />
            <h2 className="text-lg font-semibold">AI 服务配置</h2>
          </div>

          <div className="space-y-6">
            {/* AI Provider */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">AI 服务提供商</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {providerOptions.map((provider) => (
                  <button
                    key={provider.value}
                    onClick={() => {
                      setAiProvider(provider.value as AIProvider);
                    }}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      aiProvider === provider.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-medium">{provider.label}</div>
                    {provider.baseUrl && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{provider.baseUrl}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入 API Key"
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Key 将安全存储在操作系统密钥链中
              </p>
            </div>

            {/* Model Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  模型名称
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="例如：gpt-4o, claude-3-5-sonnet"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  最大 Token 数
                </label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2000)}
                  min="100"
                  max="8000"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  温度 (Temperature)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
                  min="0"
                  max="2"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* System Prompts */}
            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                自定义系统提示词
              </label>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    测试计划生成提示
                  </label>
                  <textarea
                    value={systemPromptTestPlan}
                    onChange={(e) => setSystemPromptTestPlan(e.target.value)}
                    placeholder="例如：你是一名资深测试经理，负责制定全面的测试计划..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    测试用例生成提示
                  </label>
                  <textarea
                    value={systemPromptTestCase}
                    onChange={(e) => setSystemPromptTestCase(e.target.value)}
                    placeholder="例如：你是一名测试用例设计专家，使用等价类和边界值分析方法..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                    测试脚本生成提示
                  </label>
                  <textarea
                    value={systemPromptScript}
                    onChange={(e) => setSystemPromptScript(e.target.value)}
                    placeholder="例如：你是一名自动化测试工程师，生成完整可执行的测试脚本..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-400 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Streaming Toggle */}
            <div className="flex items-center pt-4 border-t">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={enableStreaming}
                    onChange={(e) => setEnableStreaming(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`block w-10 h-6 rounded-full ${enableStreaming ? 'bg-accent' : 'bg-surface-2'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white dark:bg-slate-900 w-4 h-4 rounded-full transition-transform ${enableStreaming ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  启用流式响应
                </span>
              </label>
              <span className="ml-auto text-xs text-slate-600 dark:text-slate-400">
                实时显示 AI 生成内容
              </span>
            </div>

            {/* Test Connection */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isAIConfigured
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : isConnecting
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-surface-2 text-muted'
                }`}>
                  {isConnecting ? '连接中...' : isAIConfigured ? '已配置' : '未配置'}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSaveSettings}
                  disabled={!apiKey.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  保存设置
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={!apiKey.trim() || isConnecting}
                  className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isConnecting ? '测试中...' : '测试连接'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* AI 功能面板 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center mb-6">
            <Robot className="text-purple-600 mr-2" size={20} />
            <h2 className="text-lg font-semibold">AI 功能</h2>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handleAIGenerate('完整的产品需求文档')}
              className="w-full flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
            >
              <div className="text-left">
                <div className="flex items-center">
                  <Sparkle className="text-purple-600 dark:text-purple-400 mr-2" size={18} />
                  <span className="font-medium dark:text-slate-200">自动生成需求</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">基于市场分析生成完整需求</p>
              </div>
              {isGenerating && <Globe size={18} className="text-purple-600 dark:text-purple-400 animate-spin" />}
            </button>

            <button
              onClick={() => handleAIGenerate('详细的测试计划')}
              className="w-full flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <div className="text-left">
                <div className="flex items-center">
                  <MagicWand className="text-blue-600 dark:text-blue-400 mr-2" size={18} />
                  <span className="font-medium dark:text-slate-200">测试计划生成</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">自动生成测试策略和计划</p>
              </div>
              {isGenerating && <Globe size={18} className="text-blue-600 dark:text-blue-400 animate-spin" />}
            </button>

            <button
              onClick={() => handleAIGenerate('自动化测试脚本')}
              className="w-full flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              <div className="text-left">
                <div className="flex items-center">
                  <Robot className="text-green-600 dark:text-green-400 mr-2" size={18} />
                  <span className="font-medium dark:text-slate-200">脚本生成</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">生成 Python/JavaScript 测试脚本</p>
              </div>
              {isGenerating && <Globe size={18} className="text-green-600 dark:text-green-400 animate-spin" />}
            </button>
          </div>
        </div>

        {/* 团队成员 */}
        <MemberManagement />

        {/* 生成历史 */}
        <div className="col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">最近生成记录</h3>
          <div className="flex items-center justify-center py-8 text-slate-400 dark:text-slate-500">
            <div className="text-center">
              <Sparkle size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无生成记录</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};