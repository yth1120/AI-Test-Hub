import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  error?: string;
}

class AgentTools {
  private prisma: any;
  private keytar: any;
  private vectorDB: any;

  constructor(prisma: any, keytar: any, vectorDB: any) {
    this.prisma = prisma;
    this.keytar = keytar;
    this.vectorDB = vectorDB;
  }

  // ==================== 数据库工具 ====================

  async getRequirements(projectId: string): Promise<ToolResult> {
    try {
      const requirements = await this.prisma.requirement.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: requirements };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getRequirementById(requirementId: string): Promise<ToolResult> {
    try {
      const requirement = await this.prisma.requirement.findUnique({
        where: { id: requirementId },
      });
      return { success: true, data: requirement };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createTestCase(data: any): Promise<ToolResult> {
    try {
      const testCase = await this.prisma.testCase.create({ data });
      return { success: true, data: testCase };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createTestPoint(data: any): Promise<ToolResult> {
    try {
      const testPoint = await this.prisma.testPoint.create({ data });
      return { success: true, data: testPoint };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async createTestScript(data: any): Promise<ToolResult> {
    try {
      const script = await this.prisma.testScript.create({ data });
      return { success: true, data: script };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async updateTestScript(id: string, data: any): Promise<ToolResult> {
    try {
      const script = await this.prisma.testScript.update({ where: { id }, data });
      return { success: true, data: script };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async saveDiagnosticReport(data: any): Promise<ToolResult> {
    try {
      const report = await this.prisma.diagnosticReport.create({ data });
      return { success: true, data: report };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== 向量数据库工具 ====================

  async searchSimilarRequirements(query: string, topK: number = 5): Promise<ToolResult> {
    try {
      const results = await this.vectorDB.search(query, topK);
      return { success: true, data: results };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async addToVectorDB(id: string, content: string, metadata: any): Promise<ToolResult> {
    try {
      await this.vectorDB.addDocument(id, content, metadata);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ==================== 脚本执行工具 ====================
  // 注意：当前实现通过 child_process 在【宿主机】进程中执行脚本（并非隔离沙盒），
  // 需本机已安装对应运行时（如 Python / Node）。请勿用于执行不可信代码。
  async executeInSandbox(code: string, language: string = 'python'): Promise<SandboxResult> {
    const startTime = Date.now();
    const tempDir = path.join(process.env.TEMP || '/tmp', 'testhub-sandbox', nanoid());
    
    try {
      fs.mkdirSync(tempDir, { recursive: true });
      
      let filePath: string;
      let command: string;
      
      if (language.toLowerCase() === 'python') {
        filePath = path.join(tempDir, 'test.py');
        command = 'python';
      } else if (language.toLowerCase() === 'javascript' || language.toLowerCase() === 'node') {
        filePath = path.join(tempDir, 'test.js');
        command = 'node';
      } else {
        throw new Error(`不支持的语言: ${language}`);
      }

      fs.writeFileSync(filePath, code, 'utf-8');

      return new Promise((resolve) => {
        const { spawn } = require('child_process');
        const runner = spawn(command, [filePath], {
          cwd: tempDir,
          timeout: 60000,
          shell: true,
        });

        let stdout = '';
        let stderr = '';

        runner.stdout.on('data', (data: any) => { stdout += data.toString(); });
        runner.stderr.on('data', (data: any) => { stderr += data.toString(); });

        runner.on('close', (code: number) => {
          const duration = Date.now() - startTime;
          
          setTimeout(() => {
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
          }, 2000);

          resolve({
            success: code === 0,
            stdout,
            stderr,
            exitCode: code || 0,
            duration,
          });
        });

        runner.on('error', (err: Error) => {
          const duration = Date.now() - startTime;
          resolve({
            success: false,
            stdout,
            stderr: err.message,
            exitCode: 1,
            duration,
            error: err.message,
          });
        });
      });

    } catch (error: any) {
      return {
        success: false,
        stdout: '',
        stderr: error.message,
        exitCode: 1,
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  // ==================== Git 工具 ====================

  async getGitLog(projectPath: string, limit: number = 10): Promise<ToolResult> {
    try {
      const { execSync } = require('child_process');
      const log = execSync(`git log --oneline -${limit}`, { 
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
      });
      return { success: true, data: log };
    } catch (error: any) {
      return { success: false, error: '无法获取 Git 日志: ' + error.message };
    }
  }

  async getGitDiff(projectPath: string, filePath: string): Promise<ToolResult> {
    try {
      const { execSync } = require('child_process');
      const diff = execSync(`git diff ${filePath}`, { 
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000,
      });
      return { success: true, data: diff };
    } catch (error: any) {
      return { success: false, error: '无法获取 Git diff: ' + error.message };
    }
  }

  // ==================== AI 工具 ====================

  async callAI(prompt: string, systemPrompt: string, settings: any): Promise<ToolResult> {
    try {
      const { generateText } = await import('ai');
      const { createOpenAI } = await import('@ai-sdk/openai');
      const { createAnthropic } = await import('@ai-sdk/anthropic');

      const apiKey = await this.keytar.getPassword('testhub-pro', settings.aiProvider);
      if (!apiKey) throw new Error('未配置 API Key');

      let model;
      const provider = settings.aiProvider || 'OPENAI';
      
      if (provider === 'OPENAI' || provider === 'DEEPSEEK' || provider === 'KIMI' || provider === 'QWEN') {
        const baseUrl = settings.baseUrl || 
          (provider === 'DEEPSEEK' ? 'https://api.deepseek.com' : 
           provider === 'KIMI' ? 'https://api.moonshot.cn' : 
           provider === 'QWEN' ? 'https://dashscope.aliyuncs.com/compatible-mode/v1' : undefined);
        const openai = createOpenAI({ apiKey, baseURL: baseUrl });
        model = openai(settings.model || 'gpt-4o');
      } else if (provider === 'ANTHROPIC') {
        const anthropic = createAnthropic({ apiKey, baseURL: settings.baseUrl });
        model = anthropic(settings.model || 'claude-3-5-sonnet-20241022');
      } else {
        const openai = createOpenAI({ apiKey });
        model = openai('gpt-4o');
      }

      const result = await generateText({
        model,
        system: systemPrompt,
        prompt,
        maxTokens: settings.maxTokens || 2000,
        temperature: settings.temperature ?? 0.7,
      });

      return { success: true, data: result.text };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export { AgentTools };
