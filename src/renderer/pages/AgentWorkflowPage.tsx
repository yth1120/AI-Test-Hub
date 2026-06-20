import React, { useState, useEffect } from 'react';
import {
  Brain,
  MagnifyingGlass,
  Flask,
  Wrench,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  ArrowsClockwise,
  Lightning,
  Sparkle,
} from '@phosphor-icons/react';
import { AgentType, AgentTaskStatus } from '../../shared/types';
import type { Project } from '../../shared/types';

interface AgentWorkflowPageProps {
  currentProject: Project | null;
}

const AGENT_CARDS = [
  {
    type: AgentType.QA_ARCHITECT,
    name: 'QA 架构师 Agent',
    description: '需求分析与评审 - 模糊性检测、冲突检测、AC 自动补全',
    icon: MagnifyingGlass,
    color: 'bg-accent/10',
    features: ['需求模糊性检测', '需求冲突分析', '边界条件识别', 'Gherkin AC 生成'],
  },
  {
    type: AgentType.TEST_DESIGNER,
    name: '测试设计师 Agent',
    description: '测试设计与用例生成 - 测试点、用例生成、入库',
    icon: Brain,
    color: 'bg-accent/10',
    features: ['测试点生成', '测试用例生成', '需求追溯', '自动入库'],
  },
  {
    type: AgentType.TEST_DEVELOPER,
    name: '自动化测试 Agent',
    description: '测试开发与执行 - 脚本生成、宿主执行、自我修复',
    icon: Flask,
    color: 'bg-accent/10',
    features: ['脚本自动生成', '执行验证', '错误自我修复', '结果分析'],
  },
  {
    type: AgentType.TEST_MAINTAINER,
    name: '测试运维 Agent',
    description: '测试维护 - 失败根因分析、修复建议',
    icon: Wrench,
    color: 'bg-accent/10',
    features: ['失败日志分析', '根因定位', '修复建议', '脚本更新'],
  },
];

export function AgentWorkflowPage({ currentProject }: AgentWorkflowPageProps) {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [selectedRequirement, setSelectedRequirement] = useState<string>('');
  const [running, setRunning] = useState(false);
  // 各阶段 Agent 的实时状态（由 onAgentProgress 驱动）
  const [stageStatus, setStageStatus] = useState<Record<string, AgentTaskStatus>>({});
  const [progressText, setProgressText] = useState<string>('');
  const [qaContent, setQaContent] = useState<string>('');
  const [testPoints, setTestPoints] = useState<any[]>([]);
  const [finalResult, setFinalResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentProject?.id) {
      loadRequirements();
    }
  }, [currentProject]);

  const loadRequirements = async () => {
    if (!currentProject?.id) return;
    try {
      const data = await window.electronAPI.getRequirements(currentProject.id);
      setRequirements(data || []);
    } catch (err) {
      console.error('Failed to load requirements:', err);
    }
  };

  const resetRun = () => {
    setError(null);
    setFinalResult(null);
    setQaContent('');
    setTestPoints([]);
    setStageStatus({});
  };

  // 快速：仅运行 QA 架构师（单次真实 AI 调用）
  const runQuickQA = async () => {
    if (!selectedRequirement || !currentProject?.id || running) return;
    resetRun();
    setRunning(true);
    setProgressText('QA 架构师分析中...');
    setStageStatus({ [AgentType.QA_ARCHITECT]: AgentTaskStatus.RUNNING });
    try {
      const report = await window.electronAPI.runAgentTask({
        projectId: currentProject.id,
        requirementId: selectedRequirement,
        action: 'ANALYZE_REQUIREMENT',
      });
      setQaContent(report?.content || '（无返回内容）');
      setStageStatus({ [AgentType.QA_ARCHITECT]: AgentTaskStatus.COMPLETED });
      setProgressText('QA 分析完成');
    } catch (err: any) {
      setError(err?.message || String(err));
      setStageStatus({ [AgentType.QA_ARCHITECT]: AgentTaskStatus.FAILED });
      setProgressText('');
    } finally {
      setRunning(false);
    }
  };

  // 快速：仅生成测试点（真实 AI 调用并入库）
  const runQuickDesigner = async () => {
    if (!selectedRequirement || !currentProject?.id || running) return;
    resetRun();
    setRunning(true);
    setProgressText('测试设计师生成测试点中...');
    setStageStatus({ [AgentType.TEST_DESIGNER]: AgentTaskStatus.RUNNING });
    try {
      const points = await window.electronAPI.runAgentTask({
        projectId: currentProject.id,
        requirementId: selectedRequirement,
        action: 'GENERATE_TEST_POINTS',
      });
      setTestPoints(Array.isArray(points) ? points : []);
      setStageStatus({ [AgentType.TEST_DESIGNER]: AgentTaskStatus.COMPLETED });
      setProgressText('测试点生成完成');
    } catch (err: any) {
      setError(err?.message || String(err));
      setStageStatus({ [AgentType.TEST_DESIGNER]: AgentTaskStatus.FAILED });
      setProgressText('');
    } finally {
      setRunning(false);
    }
  };

  // 完整工作流：QA → 设计 → 开发 → 维护（真实编排器 + 实时进度）
  const runFullWorkflow = async () => {
    if (!selectedRequirement || !currentProject?.id || running) return;
    resetRun();
    setRunning(true);
    setProgressText('正在启动完整工作流...');

    const handleProgress = (data: any) => {
      const step = data?.step;
      if (!step) return;
      setStageStatus((prev) => ({ ...prev, [step.agent]: step.status }));
      setProgressText(
        `${step.agent} · ${step.action} · ${step.status} (${data.currentStep}/${data.totalSteps})`
      );
    };

    try {
      window.electronAPI.onAgentProgress(handleProgress);
      const res = await window.electronAPI.runFullAgentWorkflow(
        currentProject.id,
        selectedRequirement
      );
      if (res?.success) {
        setFinalResult(res.finalResult);
        if (res.finalResult?.qaAnalysis) {
          const qa = res.finalResult.qaAnalysis;
          setQaContent(qa.content || '');
        }
        if (res.finalResult?.designerResult?.testPoints) {
          setTestPoints(res.finalResult.designerResult.testPoints);
        }
        setProgressText('✅ 完整工作流执行完成');
      } else {
        setError(res?.error || '工作流执行失败');
        setProgressText('');
      }
    } catch (err: any) {
      setError(err?.message || String(err));
      setProgressText('');
    } finally {
      window.electronAPI.removeAgentProgressListener();
      setRunning(false);
    }
  };

  const getStatusIcon = (status?: AgentTaskStatus) => {
    switch (status) {
      case AgentTaskStatus.COMPLETED:
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case AgentTaskStatus.FAILED:
        return <XCircle className="w-5 h-5 text-rose-500" />;
      case AgentTaskStatus.RUNNING:
        return <ArrowsClockwise className="w-5 h-5 text-accent animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-muted" />;
    }
  };

  const qa = finalResult?.qaAnalysis;
  const designer = finalResult?.designerResult;
  const developer = finalResult?.developerResult;
  const maintainer = finalResult?.maintainerResult;

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-canvas p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink flex items-center gap-3">
          <Brain className="w-8 h-8 text-accent" />
          Agent 工作流
        </h1>
        <p className="text-muted mt-1">
          基于真实 LLM 的多 Agent 流水线：需求分析 → 测试设计 → 脚本开发执行 → 维护修复
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        {currentProject ? (
          <>
            {/* 需求选择 + 操作 */}
            <div className="mb-6 bg-surface rounded-lg p-4 shadow-sm border border-line">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                选择需求
              </label>
              <select
                value={selectedRequirement}
                onChange={(e) => setSelectedRequirement(e.target.value)}
                disabled={running}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-ink"
              >
                <option value="">请选择需求...</option>
                {requirements.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.title}
                  </option>
                ))}
              </select>

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={runQuickQA}
                  disabled={running || !selectedRequirement}
                  className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 border border-line text-ink hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MagnifyingGlass className="w-4 h-4" /> QA 快速分析
                </button>
                <button
                  onClick={runQuickDesigner}
                  disabled={running || !selectedRequirement}
                  className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 border border-line text-ink hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lightning className="w-4 h-4" /> 生成测试点
                </button>
                <button
                  onClick={runFullWorkflow}
                  disabled={running || !selectedRequirement}
                  className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 bg-accent hover:bg-accent/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {running ? <ArrowsClockwise className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  运行完整工作流
                </button>
              </div>

              {progressText && (
                <div className="mt-3 text-sm text-muted flex items-center gap-2">
                  <Sparkle className="w-4 h-4 text-accent" />
                  {progressText}
                </div>
              )}
              {error && (
                <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-rose-500/10 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>

            {/* 四阶段 Agent 状态卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {AGENT_CARDS.map((agent) => {
                const Icon = agent.icon;
                const status = stageStatus[agent.type];
                return (
                  <div
                    key={agent.type}
                    className="bg-surface rounded-lg p-5 shadow-sm border border-line"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`${agent.color} p-3 rounded-lg`}>
                        <Icon className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-ink">{agent.name}</h3>
                          {getStatusIcon(status)}
                        </div>
                        <p className="text-sm text-muted mt-1">{agent.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {agent.features.map((feature, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-1 bg-surface-2 text-muted rounded"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* QA 分析结果 */}
            {qaContent && (
              <div className="bg-surface rounded-lg p-6 shadow-sm border border-line mb-6">
                <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                  <MagnifyingGlass className="w-5 h-5 text-muted" />
                  QA 诊断报告
                </h2>
                <pre className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                  {qaContent}
                </pre>
              </div>
            )}

            {/* 结构化 QA 分析（完整工作流返回） */}
            {qa && (qa.ambiguities?.length || qa.suggestions?.length || qa.missingEdgeCases?.length) ? (
              <div className="bg-surface rounded-lg p-6 shadow-sm border border-line mb-6 space-y-4">
                {qa.ambiguities?.length > 0 && (
                  <div className="p-4 bg-rose-500/10 rounded-lg">
                    <h4 className="font-medium text-rose-600 dark:text-rose-400 mb-2">模糊点</h4>
                    <ul className="list-disc list-inside text-sm text-rose-600 dark:text-rose-400">
                      {qa.ambiguities.map((x: string, i: number) => <li key={i}>{x}</li>)}
                    </ul>
                  </div>
                )}
                {qa.missingEdgeCases?.length > 0 && (
                  <div className="p-4 bg-amber-500/10 rounded-lg">
                    <h4 className="font-medium text-amber-600 dark:text-amber-400 mb-2">遗漏边界</h4>
                    <ul className="list-disc list-inside text-sm text-amber-600 dark:text-amber-400">
                      {qa.missingEdgeCases.map((x: string, i: number) => <li key={i}>{x}</li>)}
                    </ul>
                  </div>
                )}
                {qa.suggestions?.length > 0 && (
                  <div className="p-4 bg-emerald-500/10 rounded-lg">
                    <h4 className="font-medium text-emerald-600 dark:text-emerald-400 mb-2">建议</h4>
                    <ul className="list-disc list-inside text-sm text-emerald-600 dark:text-emerald-400">
                      {qa.suggestions.map((x: string, i: number) => <li key={i}>{x}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}

            {/* 测试点 */}
            {testPoints.length > 0 && (
              <div className="bg-surface rounded-lg p-6 shadow-sm border border-line mb-6">
                <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                  <Lightning className="w-5 h-5 text-muted" />
                  测试点（{testPoints.length}）
                </h2>
                <div className="space-y-2">
                  {testPoints.map((point, i) => (
                    <div key={point.id || i} className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg">
                      <Flask className="w-4 h-4 text-muted" />
                      <span className="text-ink">{point.title}</span>
                      <span
                        className={`ml-auto text-xs px-2 py-1 rounded ${
                          point.priority === 'HIGH'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-surface-2 text-muted'
                        }`}
                      >
                        {point.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 完整工作流汇总 */}
            {finalResult && (
              <div className="bg-surface rounded-lg p-6 shadow-sm border border-line">
                <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                  <Flask className="w-5 h-5 text-muted" />
                  工作流结果汇总
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 bg-surface-2 rounded-lg">
                    <div className="text-2xl font-bold text-ink">
                      {designer?.testCases?.length ?? 0}
                    </div>
                    <div className="text-muted">生成测试用例</div>
                  </div>
                  <div className="p-4 bg-emerald-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-ink">
                      {developer?.executedScripts?.length ?? 0}
                    </div>
                    <div className="text-muted">生成/执行脚本</div>
                  </div>
                  <div className="p-4 bg-surface-2 rounded-lg">
                    <div className="text-2xl font-bold text-ink">
                      {maintainer?.fixes?.length ?? 0}
                    </div>
                    <div className="text-muted">维护修复建议</div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted">请先选择或创建项目</div>
        )}
      </div>
    </div>
  );
}
