/**
 * window.electronAPI 全局类型声明
 *
 * 历史背景：原桌面版（Electron）通过 preload.ts 的 contextBridge 暴露此对象。
 * 桌面版删除后，团队版（Next.js）通过 lib/electron-api-polyfill.ts 把
 * lib/api-client.ts 挂到 window.electronAPI，让复用的 src/renderer 页面/hooks
 * 无需改动即可在浏览器中调用 HTTP API。此声明保留是为了让 renderer 代码里的
 * window.electronAPI.* 调用保持类型。
 */

declare global {
  interface Window {
    electronAPI: {
      getProjects: () => Promise<any[]>;
      getProject: (id: string) => Promise<any>;
      createProject: (data: any) => Promise<any>;
      updateProject: (id: string, data: any) => Promise<any>;
      deleteProject: (id: string) => Promise<any>;
      getRequirements: (projectId: string) => Promise<any[]>;
      createRequirement: (data: any) => Promise<any>;
      updateRequirement: (id: string, data: any) => Promise<any>;
      deleteRequirement: (id: string) => Promise<{ success: boolean }>;
      getTestCases: (projectId: string) => Promise<any[]>;
      createTestCase: (data: any) => Promise<any>;
      updateTestCase: (id: string, data: any) => Promise<any>;
      deleteTestCase: (id: string) => Promise<{ success: boolean }>;
      getDefects: (projectId: string) => Promise<any[]>;
      createDefect: (data: any) => Promise<any>;
      updateDefect: (id: string, data: any) => Promise<any>;
      deleteDefect: (id: string) => Promise<{ success: boolean }>;
      getTestScripts: (projectId: string) => Promise<any[]>;
      createTestScript: (data: any) => Promise<any>;
      updateTestScript: (id: string, data: any) => Promise<any>;
      deleteTestScript: (id: string) => Promise<{ success: boolean }>;
      getDashboardStats: (projectId: string) => Promise<any>;
      getProjectSettings: (projectId: string) => Promise<any>;
      saveProjectSettings: (projectId: string, settings: any) => Promise<any>;
      loadApiKey: (projectId: string, aiProvider: string) => Promise<string>;
      getProjectMembers: (projectId: string) => Promise<any[]>;
      addProjectMember: (projectId: string, email: string, role?: string) => Promise<any>;
      updateMemberRole: (projectId: string, userId: string, role: string) => Promise<any>;
      removeProjectMember: (projectId: string, userId: string) => Promise<any>;
      searchUsers: (q: string) => Promise<any[]>;
      generateContent: (params: any) => Promise<any>;
      generateTestPlan: (requirementId: string) => Promise<any>;
      generateTestCases: (requirementId: string) => Promise<any>;
      generateTestScript: (testCaseId: string) => Promise<any>;
      selectFolder: () => Promise<string>;
      getAppVersion: () => Promise<string>;

      // Agent Workflows
      createAgentWorkflow: (projectId: string, type: string, name: string, description?: string) => Promise<any>;
      getAgentWorkflows: (projectId: string, type?: string) => Promise<any[]>;
      runAgentTask: (params: any) => Promise<any>;
      executeTestScript: (projectId: string, scriptId: string) => Promise<any>;
      selfHealScript: (projectId: string, testCaseId: string, originalXPath: string) => Promise<any>;
      analyzeRootCause: (projectId: string, defectId: string, errorLog: string) => Promise<any>;

      // Simple Test Agent (Hello World)
      runTestAgent: (requirement: string) => Promise<any>;

      // Vector DB Operations
      addToVectorDB: (id: string, content: string, metadata: any) => Promise<void>;
      searchVectorDB: (query: string, topK?: number) => Promise<any[]>;
      clearVectorDB: () => Promise<void>;

      // Full Agent Workflow (4 Agents)
      runFullAgentWorkflow: (projectId: string, requirementId: string) => Promise<any>;
      onAgentProgress: (callback: (data: any) => void) => void;
      removeAgentProgressListener: () => void;
    };
  }
}

export {};
