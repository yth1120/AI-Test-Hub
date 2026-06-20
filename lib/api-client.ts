/**
 * 浏览器端 API 客户端
 *
 * 替代旧的 window.electronAPI.* IPC 调用为 fetch('/api/...') HTTP 请求。
 * 方法签名与旧 electronAPI 保持一致，让域 hooks 迁移改动最小。
 */

import type {
  Project, Requirement, TestCase, Defect, TestScript, TestPlan,
  ProjectStats, ProjectSettings, AIContentParams, AIContentResponse,
} from '@/../src/shared/types';

// ==================== 请求工具 ====================

const BASE = '';

async function request<T = any>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    credentials: 'include', // 携带 Auth.js session cookie
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

function get<T = any>(path: string) { return request<T>('GET', path); }
function post<T = any>(path: string, body?: unknown) { return request<T>('POST', path, body); }
function patch<T = any>(path: string, body?: unknown) { return request<T>('PATCH', path, body); }
function del<T = any>(path: string) { return request<T>('DELETE', path); }

// ==================== API Client ====================

// Agent 进度回调：onAgentProgress 注册，runFullAgentWorkflow 读取 NDJSON 流时调用。
let agentProgressHandler: ((data: any) => void) | null = null;

export const apiClient = {
  // ---- 项目 ----
  getProjects: () => get<Project[]>('/api/projects'),
  getProject: (id: string) => get<Project>(`/api/projects/${id}`),
  createProject: (data: { name: string; description?: string }) => post<Project>('/api/projects', data),
  updateProject: (id: string, data: { name?: string; description?: string }) =>
    patch<Project>(`/api/projects/${id}`, data),
  deleteProject: (id: string) => del<void>(`/api/projects/${id}`),

  // ---- 需求 ----
  getRequirements: (projectId: string) => get<Requirement[]>(`/api/projects/${projectId}/requirements`),
  getRequirement: (id: string) => get<Requirement>(`/api/requirements/${id}`),
  createRequirement: (data: Partial<Requirement> & { projectId: string }) =>
    post<Requirement>(`/api/projects/${data.projectId}/requirements`, data),
  updateRequirement: (id: string, data: Partial<Requirement>) =>
    patch<Requirement>(`/api/requirements/${id}`, data),
  deleteRequirement: (id: string) => del<void>(`/api/requirements/${id}`),

  // ---- 测试用例 ----
  getTestCases: (projectId: string) => get<TestCase[]>(`/api/projects/${projectId}/test-cases`),
  getTestCase: (id: string) => get<TestCase>(`/api/test-cases/${id}`),
  createTestCase: (data: Partial<TestCase> & { projectId: string }) =>
    post<TestCase>(`/api/projects/${data.projectId}/test-cases`, data),
  updateTestCase: (id: string, data: Partial<TestCase>) =>
    patch<TestCase>(`/api/test-cases/${id}`, data),
  deleteTestCase: (id: string) => del<void>(`/api/test-cases/${id}`),

  // ---- 缺陷 ----
  getDefects: (projectId: string) => get<Defect[]>(`/api/projects/${projectId}/defects`),
  getDefect: (id: string) => get<Defect>(`/api/defects/${id}`),
  createDefect: (data: Partial<Defect> & { projectId: string }) =>
    post<Defect>(`/api/projects/${data.projectId}/defects`, data),
  updateDefect: (id: string, data: Partial<Defect>) =>
    patch<Defect>(`/api/defects/${id}`, data),
  deleteDefect: (id: string) => del<void>(`/api/defects/${id}`),  // Not in API yet, soft-delete by status

  // ---- 测试脚本 ----
  getTestScripts: (projectId: string) => get<TestScript[]>(`/api/projects/${projectId}/test-scripts`),
  getTestScript: (id: string) => get<TestScript>(`/api/test-scripts/${id}`),
  createTestScript: (data: Partial<TestScript> & { projectId: string }) =>
    post<TestScript>(`/api/projects/${data.projectId}/test-scripts`, data),
  updateTestScript: (id: string, data: Partial<TestScript>) =>
    patch<TestScript>(`/api/test-scripts/${id}`, data),
  deleteTestScript: (id: string) => del<void>(`/api/test-scripts/${id}`),

  // ---- 仪表盘统计 ----
  getDashboardStats: (projectId: string) =>
    get<ProjectStats>(`/api/projects/${projectId}/dashboard-stats`),

  // ---- 项目设置 ----
  getProjectSettings: (projectId: string) =>
    get<ProjectSettings>(`/api/projects/${projectId}/settings`),
  saveProjectSettings: (projectId: string, data: Partial<ProjectSettings>) =>
    patch<ProjectSettings>(`/api/projects/${projectId}/settings`, data),
  // 从项目设置读取 API Key（保存时已持久化到 DB）
  loadApiKey: async (projectId: string, _aiProvider: string) => {
    const settings = await get<any>(`/api/projects/${projectId}/settings`);
    return settings?.apiKey || '';
  },

  // ---- 项目成员 ----
  getProjectMembers: (projectId: string) =>
    get<any[]>(`/api/projects/${projectId}/members`),
  addProjectMember: (projectId: string, email: string, role?: string) =>
    post<any>(`/api/projects/${projectId}/members`, { email, role }),
  updateMemberRole: (projectId: string, userId: string, role: string) =>
    patch<any>(`/api/projects/${projectId}/members/${userId}`, { role }),
  removeProjectMember: (projectId: string, userId: string) =>
    del<void>(`/api/projects/${projectId}/members/${userId}`),
  searchUsers: (q: string) =>
    get<any[]>(`/api/users/search?q=${encodeURIComponent(q)}`),

  // ---- AI 生成 ----
  generateContent: (params: AIContentParams & { type: string }) =>
    post<AIContentResponse>('/api/ai/generate', params),

  // ---- 审计日志 ----
  getAuditLogs: (projectId: string, params?: { entity?: string; action?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.entity) qs.set('entity', params.entity);
    if (params?.action) qs.set('action', params.action);
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return get<any[]>(`/api/projects/${projectId}/audit-logs${query ? `?${query}` : ''}`);
  },

  // ---- 评论 ----
  getComments: (targetType: string, targetId: string) =>
    get<any[]>(`/api/comments?targetType=${targetType}&targetId=${targetId}`),
  createComment: (data: { content: string; targetType: string; targetId: string; projectId: string; parentId?: string }) =>
    post<any>('/api/comments', data),

  // ---- 追溯矩阵 ----
  getTraceabilityMatrix: (projectId: string) =>
    get<{ matrix: any[]; summary: any }>(`/api/projects/${projectId}/traceability-matrix`),

  // ---- 执行轮次 ----
  getExecutionRounds: (projectId: string) =>
    get<any[]>(`/api/projects/${projectId}/execution-rounds`),
  createExecutionRound: (projectId: string, data: { name: string; description?: string; testPlanId?: string; testCaseIds: string[] }) =>
    post<any>(`/api/projects/${projectId}/execution-rounds`, data),

  // ---- 通知 ----
  getNotifications: (opts?: { unread?: boolean; limit?: number }) => {
    const qs = new URLSearchParams();
    if (opts?.unread) qs.set('unread', '1');
    if (opts?.limit) qs.set('limit', String(opts.limit));
    const query = qs.toString();
    return get<{ items: any[]; unreadCount: number }>(`/api/notifications${query ? `?${query}` : ''}`);
  },
  markNotificationsRead: (id?: string) => patch<{ success: boolean }>('/api/notifications', id ? { id } : {}),

  // ---- 全局搜索 ----
  search: (projectId: string, q: string) =>
    get<{ requirements: any[]; testCases: any[]; defects: any[]; testPlans: any[] }>(
      `/api/projects/${projectId}/search?q=${encodeURIComponent(q)}`,
    ),

  // ---- 附件 ----
  getAttachments: (projectId: string, targetType: string, targetId: string) =>
    get<any[]>(`/api/projects/${projectId}/attachments?targetType=${targetType}&targetId=${targetId}`),
  uploadAttachment: async (projectId: string, targetType: string, targetId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('targetType', targetType);
    fd.append('targetId', targetId);
    const res = await fetch(`/api/projects/${projectId}/attachments`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },
  deleteAttachment: (id: string) => del<void>(`/api/attachments/${id}`),

  // ---- 测试计划 ----
  getTestPlans: (projectId: string) =>
    get<any[]>(`/api/projects/${projectId}/test-plans`),
  getTestPlan: (id: string) =>
    get<any>(`/api/test-plans/${id}`),
  createTestPlan: (projectId: string, data: Partial<TestPlan> & { requirementIds?: string[] }) =>
    post<any>(`/api/projects/${projectId}/test-plans`, data),
  updateTestPlan: (id: string, data: Partial<TestPlan>) =>
    patch<any>(`/api/test-plans/${id}`, data),
  deleteTestPlan: (id: string) =>
    del<void>(`/api/test-plans/${id}`),
  addPlanRequirement: (planId: string, requirementId: string) =>
    post<any>(`/api/test-plans/${planId}/requirements`, { requirementId }),
  removePlanRequirement: (planId: string, requirementId: string) =>
    del<void>(`/api/test-plans/${planId}/requirements?requirementId=${requirementId}`),

  // ---- Agent ----
  // 单步任务：QA 分析 / 生成测试点 / 生成 AC
  runAgentTask: (params: { projectId: string; requirementId: string; action: string }) =>
    post<any>(`/api/projects/${params.projectId}/agent/task`, {
      requirementId: params.requirementId,
      action: params.action,
    }),

  // 完整工作流：读取 NDJSON 流，progress 行回调进度，result 行作为最终结果
  runFullAgentWorkflow: async (projectId: string, requirementId: string) => {
    const res = await fetch(`/api/projects/${projectId}/agent/run-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ requirementId }),
    });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: any = { success: false, error: '工作流无结果' };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        let evt: any;
        try { evt = JSON.parse(line); } catch { continue; }
        if (evt.type === 'progress') {
          agentProgressHandler?.({ step: evt.step, currentStep: evt.currentStep, totalSteps: evt.totalSteps });
        } else if (evt.type === 'result') {
          const { type: _t, ...rest } = evt;
          finalResult = rest;
        }
      }
    }
    return finalResult;
  },

  // ---- Agent 进度监听 ----
  onAgentProgress: (handler: (data: any) => void) => {
    agentProgressHandler = handler;
    return () => { agentProgressHandler = null; };
  },
  removeAgentProgressListener: () => { agentProgressHandler = null; },
} as const;

// 兼容旧的 window.electronAPI 检查模式
export const isElectronAPI = () => false;
