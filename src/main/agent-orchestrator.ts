import { AgentTools, SandboxResult } from './agent-tools';
import { nanoid } from 'nanoid';
// AgentType / AgentTaskStatus 是枚举，被当作【值】使用（如 AgentType.QA_ARCHITECT），
// 不能用 import type，否则编译后枚举被擦除导致运行时 ReferenceError。
import { AgentType, AgentTaskStatus } from '../shared/types';

interface WorkflowStep {
  id: string;
  agent: AgentType;
  action: string;
  status: AgentTaskStatus;
  input: any;
  output?: any;
  error?: string;
  startTime?: string;
  endTime?: string;
}

interface WorkflowResult {
  success: boolean;
  workflowId: string;
  steps: WorkflowStep[];
  finalResult?: any;
  error?: string;
}

type ProgressCallback = (step: WorkflowStep, currentStep: number, totalSteps: number) => void;

const QA_ARCHITECT_PROMPT = `你是一位资深 QA 架构师，精通需求分析和评审。你能够：
1. 识别需求中的模糊性和不明确之处
2. 检测需求之间的冲突
3. 发现遗漏的边界条件（如断网、并发、异常输入）
4. 补全验收标准（使用 Gherkin 语法 Given-When-Then）

请以结构化方式输出诊断结果。`;

const TEST_DESIGNER_PROMPT = `你是一位测试用例设计专家，精通：
1. 等价类划分和边界值分析
2. 正交试验法
3. 状态迁移测试
4. 需求到测试用例的双向追溯
5. 测试数据自动合成

请生成详细、可执行的测试用例和测试点。`;

const TEST_DEVELOPER_PROMPT = `你是一位资深自动化测试开发工程师，精通：
1. Python (pytest/Playwright/Selenium)
2. TypeScript (Playwright/Cypress)
3. API 测试和 Fuzzing
4. 测试脚本自我反思和修复
5. 沙盒环境执行和调试

请生成完整、可运行的自动化测试代码。`;

const TEST_MAINTAINER_PROMPT = `你是一位测试运维专家，精通：
1. UI 测试元素定位（XPath/CSS）自愈
2. 失败日志根因分析
3. 测试脚本维护和优化
4. 结合 Git 历史分析 Bug 来源

请提供智能诊断和修复建议。`;

class AgentOrchestrator {
  private tools: AgentTools;
  private prisma: any;
  private maxRetries: number = 3;

  constructor(prisma: any, keytar: any, vectorDB: any) {
    this.prisma = prisma;
    this.tools = new AgentTools(prisma, keytar, vectorDB);
  }

  // 从 LLM 文本中稳健解析 JSON：去除 ``` 代码围栏，提取最外层 { ... } 再解析。
  // 失败返回 null，由各调用方回退默认值。
  private parseLooseJSON(text: string): any | null {
    if (!text) return null;
    const cleaned = text.replace(/```(?:json)?/gi, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    const candidate = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        // 容错：去掉对象/数组的尾随逗号后重试
        return JSON.parse(candidate.replace(/,(\s*[}\]])/g, '$1'));
      } catch {
        return null;
      }
    }
  }

  async runFullWorkflow(
    projectId: string,
    requirementId: string,
    onProgress?: ProgressCallback
  ): Promise<WorkflowResult> {
    const workflowId = 'wf_' + nanoid();
    const steps: WorkflowStep[] = [];
    
    console.log(`🚀 开始执行完整工作流: ${workflowId}`);
    console.log(`📋 需求ID: ${requirementId}`);

    try {
      // 获取设置
      const settings = await this.prisma.projectSettings.findFirst({ where: { projectId } });
      if (!settings) {
        throw new Error('项目未配置 AI 服务');
      }

      // 获取需求
      const reqResult = await this.tools.getRequirementById(requirementId);
      if (!reqResult.success || !reqResult.data) {
        throw new Error('需求不存在: ' + reqResult.error);
      }
      const requirement = reqResult.data;

      // ═══════════════════════════════════════════════════════
      // 阶段 1: QA Architect Agent - 需求分析
      // ═══════════════════════════════════════════════════════
      const step1: WorkflowStep = {
        id: 'step_1',
        agent: AgentType.QA_ARCHITECT,
        action: 'ANALYZE_REQUIREMENT',
        status: AgentTaskStatus.RUNNING,
        input: { requirement },
        startTime: new Date().toISOString(),
      };
      steps.push(step1);
      onProgress?.(step1, 1, 4);

      const qaAnalysis = await this.runQAAgent(requirement, settings, onProgress);
      step1.output = qaAnalysis;
      step1.status = qaAnalysis.success ? AgentTaskStatus.COMPLETED : AgentTaskStatus.FAILED;
      step1.endTime = new Date().toISOString();
      onProgress?.(step1, 1, 4);

      if (!qaAnalysis.success) {
        throw new Error('QA 分析失败: ' + qaAnalysis.error);
      }

      // 保存诊断报告到数据库
      await this.tools.saveDiagnosticReport({
        requirementId,
        projectId,
        ambiguities: JSON.stringify(qaAnalysis.ambiguities || []),
        conflicts: JSON.stringify(qaAnalysis.conflicts || []),
        missingEdgeCases: JSON.stringify(qaAnalysis.missingEdgeCases || []),
        suggestions: JSON.stringify(qaAnalysis.suggestions || []),
        confidence: qaAnalysis.confidence || 0.8,
      });

      // ═══════════════════════════════════════════════════════
      // 阶段 2: Test Designer Agent - 测试设计
      // ═══════════════════════════════════════════════════════
      const step2: WorkflowStep = {
        id: 'step_2',
        agent: AgentType.TEST_DESIGNER,
        action: 'GENERATE_TEST_CASES',
        status: AgentTaskStatus.RUNNING,
        input: { requirement, qaAnalysis },
        startTime: new Date().toISOString(),
      };
      steps.push(step2);
      onProgress?.(step2, 2, 4);

      const designerResult = await this.runTestDesignerAgent(requirement, qaAnalysis, projectId, settings, onProgress);
      step2.output = designerResult;
      step2.status = designerResult.success ? AgentTaskStatus.COMPLETED : AgentTaskStatus.FAILED;
      step2.endTime = new Date().toISOString();
      onProgress?.(step2, 2, 4);

      if (!designerResult.success) {
        throw new Error('测试设计失败: ' + designerResult.error);
      }

      // ═══════════════════════════════════════════════════════
      // 阶段 3: Test Developer Agent - 脚本开发与执行
      // ═══════════════════════════════════════════════════════
      const step3: WorkflowStep = {
        id: 'step_3',
        agent: AgentType.TEST_DEVELOPER,
        action: 'GENERATE_AND_EXECUTE',
        status: AgentTaskStatus.RUNNING,
        input: { testCases: designerResult.testCases },
        startTime: new Date().toISOString(),
      };
      steps.push(step3);
      onProgress?.(step3, 3, 4);

      const developerResult = await this.runTestDeveloperAgent(
        designerResult.testCases, 
        projectId, 
        settings,
        onProgress
      );
      step3.output = developerResult;
      step3.status = developerResult.success ? AgentTaskStatus.COMPLETED : AgentTaskStatus.FAILED;
      step3.endTime = new Date().toISOString();
      onProgress?.(step3, 3, 4);

      // ═══════════════════════════════════════════════════════
      // 阶段 4: Test Maintainer Agent（如有失败）
      // ═══════════════════════════════════════════════════════
      let maintainerResult = null;
      
      if (!developerResult.success && developerResult.failedScripts?.length > 0) {
        const step4: WorkflowStep = {
          id: 'step_4',
          agent: AgentType.TEST_MAINTAINER,
          action: 'SELF_HEAL_AND_ANALYZE',
          status: AgentTaskStatus.RUNNING,
          input: { failedScripts: developerResult.failedScripts },
          startTime: new Date().toISOString(),
        };
        steps.push(step4);
        onProgress?.(step4, 4, 4);

        maintainerResult = await this.runTestMaintainerAgent(
          developerResult.failedScripts,
          developerResult.errors,
          projectId,
          settings,
          onProgress
        );
        step4.output = maintainerResult;
        step4.status = maintainerResult.success ? AgentTaskStatus.COMPLETED : AgentTaskStatus.FAILED;
        step4.endTime = new Date().toISOString();
        onProgress?.(step4, 4, 4);
      } else {
        // 跳过维护阶段，标记为完成
        const step4: WorkflowStep = {
          id: 'step_4',
          agent: AgentType.TEST_MAINTAINER,
          action: 'SKIPPED',
          status: AgentTaskStatus.COMPLETED,
          input: {},
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
        };
        steps.push(step4);
        onProgress?.(step4, 4, 4);
      }

      // ═══════════════════════════════════════════════════════
      // 完成：汇总结果
      // ═══════════════════════════════════════════════════════
      console.log(`✅ 工作流完成: ${workflowId}`);

      return {
        success: developerResult.success,
        workflowId,
        steps,
        finalResult: {
          qaAnalysis,
          designerResult,
          developerResult,
          maintainerResult,
        },
      };

    } catch (error: any) {
      console.error(`❌ 工作流失败: ${error.message}`);
      return {
        success: false,
        workflowId,
        steps,
        error: error.message,
      };
    }
  }

  // ═══════════════════════════════════════════════════════
  // QA Architect Agent 实现
  // ═══════════════════════════════════════════════════════
  private async runQAAgent(
    requirement: any, 
    settings: any,
    _onProgress?: ProgressCallback
  ): Promise<any> {
    console.log('🔍 QA Architect Agent 分析需求...');

    // 检索相似历史需求
    const searchResult = await this.tools.searchSimilarRequirements(
      requirement.title + ' ' + (requirement.description || ''),
      3
    );
    
    let contextSection = '';
    if (searchResult.success && searchResult.data?.length > 0) {
      contextSection = '\n\n## 参考的历史需求：\n';
      searchResult.data.forEach((s: any, i: number) => {
        contextSection += `${i + 1}. ${s.metadata?.title || '未知'}\n相似度: ${Math.round(s.similarity * 100)}%\n${s.content}\n\n`;
      });
    }

    const prompt = `请分析以下测试需求并给出结构化诊断：

需求标题：${requirement.title}
需求描述：${requirement.description || '无'}

${contextSection}

请按以下 JSON 格式输出：
{
  "clarityScore": 7,
  "ambiguities": ["模糊点1", "模糊点2"],
  "conflicts": ["冲突1"],
  "missingEdgeCases": ["边界1", "边界2"],
  "suggestions": ["建议1", "建议2"],
  "acceptanceCriteria": ["Given...When...Then...", ...],
  "confidence": 0.85
}`;

    const result = await this.tools.callAI(prompt, QA_ARCHITECT_PROMPT, settings);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // 解析 JSON 响应
    try {
      const parsed = this.parseLooseJSON(result.data);
      if (parsed) {
        
        // 添加当前需求到向量库
        await this.tools.addToVectorDB(
          'req_' + requirement.id,
          requirement.title + ' ' + (requirement.description || ''),
          { title: requirement.title, requirementId: requirement.id }
        );

        return {
          success: true,
          ...parsed,
        };
      }
    } catch (e) {
      console.error('解析 QA 分析结果失败:', e);
    }

    return {
      success: true,
      clarityScore: 7,
      ambiguities: ['解析失败，使用默认分析'],
      conflicts: [],
      missingEdgeCases: ['需要人工补充'],
      suggestions: ['请人工审核需求'],
      acceptanceCriteria: ['待生成'],
      confidence: 0.5,
    };
  }

  // ═══════════════════════════════════════════════════════
  // Test Designer Agent 实现
  // ═══════════════════════════════════════════════════════
  private async runTestDesignerAgent(
    requirement: any,
    qaAnalysis: any,
    projectId: string,
    settings: any,
    _onProgress?: ProgressCallback
  ): Promise<any> {
    console.log('📝 Test Designer Agent 生成测试用例...');

    const prompt = `基于以下需求分析和验收标准，生成详细的测试用例：

需求标题：${requirement.title}
需求描述：${requirement.description || '无'}

验收标准：
${(qaAnalysis.acceptanceCriteria || []).join('\n')}

请生成 5-10 个测试用例，按以下 JSON 格式输出：
{
  "testCases": [
    {
      "title": "用例标题",
      "preconditions": "前置条件",
      "steps": ["步骤1", "步骤2", "步骤3"],
      "expectedResult": "预期结果",
      "priority": "HIGH/MEDIUM/LOW",
      "category": "FUNCTIONAL/PERFORMANCE/SECURITY"
    },
    ...
  ],
  "testPoints": [
    {
      "title": "测试点标题",
      "category": "FUNCTIONAL",
      "priority": "HIGH"
    },
    ...
  ]
}`;

    const result = await this.tools.callAI(prompt, TEST_DESIGNER_PROMPT, settings || { maxTokens: 3000, temperature: 0.7 });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    try {
      const parsed = this.parseLooseJSON(result.data);
      if (parsed) {
        
        const testCases = [];
        const testPoints = [];

        // 保存测试点到数据库
        if (parsed.testPoints) {
          for (const tp of parsed.testPoints) {
            const tpResult = await this.tools.createTestPoint({
              title: tp.title,
              category: tp.category || 'FUNCTIONAL',
              priority: tp.priority || 'MEDIUM',
              requirementId: requirement.id,
              projectId,
            });
            if (tpResult.success) {
              testPoints.push(tpResult.data);
            }
          }
        }

        // 保存测试用例到数据库
        if (parsed.testCases) {
          for (const tc of parsed.testCases) {
            const tcResult = await this.tools.createTestCase({
              title: tc.title,
              preconditions: tc.preconditions || '',
              steps: JSON.stringify(tc.steps || []),
              expectedResult: tc.expectedResult || '',
              priority: tc.priority || 'MEDIUM',
              category: tc.category || 'FUNCTIONAL',
              status: 'PENDING',
              requirementId: requirement.id,
              projectId,
            });
            if (tcResult.success) {
              testCases.push(tcResult.data);
            }
          }
        }

        return {
          success: true,
          testCases,
          testPoints,
        };
      }
    } catch (e) {
      console.error('解析测试用例失败:', e);
    }

    return {
      success: true,
      testCases: [],
      testPoints: [],
    };
  }

  // ═══════════════════════════════════════════════════════
  // Test Developer Agent 实现（带 ReAct 自我修复）
  // ═══════════════════════════════════════════════════════
  private async runTestDeveloperAgent(
    testCases: any[],
    projectId: string,
    settings: any,
    onProgress?: ProgressCallback
  ): Promise<any> {
    console.log('⚡ Test Developer Agent 生成并执行测试脚本...');

    const results = [];
    const failedScripts = [];
    const errors = [];

    for (let i = 0; i < Math.min(testCases.length, 3); i++) {
      const tc = testCases[i];
      
      onProgress?.({
        id: `script_${i}`,
        agent: AgentType.TEST_DEVELOPER,
        action: 'GENERATE_SCRIPT',
        status: AgentTaskStatus.RUNNING,
        input: { testCase: tc },
        startTime: new Date().toISOString(),
      }, 3 + i, 3 + testCases.length);

      // 生成脚本
      const prompt = `请为以下测试用例生成 Python pytest 测试脚本：

用例标题：${tc.title}
前置条件：${tc.preconditions || '无'}
测试步骤：${JSON.stringify(tc.steps)}
预期结果：${tc.expectedResult}

要求：
1. 使用 pytest 框架
2. 包含适当的 assertions
3. 添加合理的等待和错误处理
4. 代码完整可运行`;

      const scriptResult = await this.tools.callAI(prompt, TEST_DEVELOPER_PROMPT, settings);
      
      const scriptCode = scriptResult.success ? scriptResult.data : '# 生成失败';

      // 保存脚本到数据库
      const saveResult = await this.tools.createTestScript({
        title: `Script_${tc.title}`,
        code: scriptCode,
        language: 'PYTHON',
        testCaseId: tc.id,
        projectId,
      });

      if (saveResult.success) {
        results.push({ testCaseId: tc.id, scriptId: saveResult.data.id, code: scriptCode });

        // ReAct 循环：执行并自我修复
        const executionResult = await this.executeWithSelfHealing(
          saveResult.data.id,
          scriptCode,
          settings,
          onProgress
        );

        if (!executionResult.success) {
          failedScripts.push({ testCaseId: tc.id, scriptId: saveResult.data.id });
          errors.push(executionResult.error);
        }
      }
    }

    return {
      success: failedScripts.length === 0,
      executedScripts: results,
      failedScripts,
      errors,
    };
  }

  // ReAct 自我修复循环
  private async executeWithSelfHealing(
    scriptId: string,
    scriptCode: string,
    settings: any,
    _onProgress?: ProgressCallback
  ): Promise<SandboxResult> {
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      console.log(`🔄 执行尝试 ${attempt + 1}/${this.maxRetries}`);
      
      // 在沙盒中执行
      const result = await this.tools.executeInSandbox(scriptCode, 'python');

      if (result.success) {
        console.log(`✅ 脚本执行成功`);
        return result;
      }

      console.log(`❌ 执行失败: ${result.stderr || result.error}`);
      
      // 反思：请求 AI 修复
      const fixPrompt = `以下 Python pytest 测试脚本执行失败，请修复：

原始代码：
\`\`\`python
${scriptCode}
\`\`\`

错误信息：
${result.stderr || result.error}

请直接输出修复后的完整代码，不要解释。`;

      const fixResult = await this.tools.callAI(fixPrompt, TEST_DEVELOPER_PROMPT, settings);
      
      if (fixResult.success) {
        scriptCode = fixResult.data;
        
        // 更新数据库中的脚本
        await this.tools.updateTestScript(scriptId, { code: scriptCode });
        
        console.log(`🔧 已应用修复，脚本已更新`);
      }
    }

    return {
      success: false,
      stdout: '',
      stderr: '达到最大重试次数',
      exitCode: 1,
      duration: 0,
      error: '达到最大重试次数',
    };
  }

  // ═══════════════════════════════════════════════════════
  // Test Maintainer Agent 实现
  // ═══════════════════════════════════════════════════════
  private async runTestMaintainerAgent(
    failedScripts: any[],
    errors: string[],
    _projectId: string,
    settings: any,
    _onProgress?: ProgressCallback
  ): Promise<any> {
    console.log('🔧 Test Maintainer Agent 分析失败并尝试修复...');

    const fixes = [];

    for (let i = 0; i < failedScripts.length; i++) {
      const fs = failedScripts[i];
      const error = errors[i];

      const prompt = `以下测试脚本执行失败，请分析原因并提供修复建议：

错误信息：${error}

请按以下 JSON 格式输出：
{
  "rootCause": "根本原因分析",
  "fixSuggestion": "修复建议",
  "fixedCode": "修复后的代码（如能确定）"
}`;

      const result = await this.tools.callAI(prompt, TEST_MAINTAINER_PROMPT, settings || { maxTokens: 2000, temperature: 0.7 });

      try {
        const parsed = this.parseLooseJSON(result.data);
        if (parsed) {
          fixes.push({
            testCaseId: fs.testCaseId,
            scriptId: fs.scriptId,
            ...parsed,
          });

          // 如果有修复代码，更新数据库
          if (parsed.fixedCode) {
            await this.tools.updateTestScript(fs.scriptId, { code: parsed.fixedCode });
          }
        }
      } catch (e) {
        console.error('解析维护建议失败:', e);
      }
    }

    return {
      success: true,
      fixes,
    };
  }
}

export { AgentOrchestrator };
