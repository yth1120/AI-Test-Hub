import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { AIContentParams } from '../shared/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getModel(provider: string, apiKey: string, baseUrl?: string, model?: string): any {
  const p = (provider || '').toUpperCase();

  if (p === 'OPENAI') {
    const openai = createOpenAI({ apiKey, baseURL: baseUrl || undefined });
    return openai(model || 'gpt-4o');
  }
  if (p === 'ANTHROPIC') {
    const anthropic = createAnthropic({ apiKey, baseURL: baseUrl || undefined });
    return anthropic(model || 'claude-3-5-sonnet-20241022');
  }
  if (p === 'GOOGLE') {
    const google = createGoogleGenerativeAI({ apiKey });
    return google(model || 'gemini-1.5-pro');
  }
  if (p === 'DEEPSEEK') {
    const deepseek = createOpenAI({ apiKey, baseURL: baseUrl || 'https://api.deepseek.com' });
    return deepseek(model || 'deepseek-chat');
  }
  if (p === 'KIMI') {
    const kimi = createOpenAI({ apiKey, baseURL: baseUrl || 'https://api.moonshot.cn' });
    return kimi(model || 'moonshot-v1-8k');
  }
  if (p === 'QWEN') {
    const qwen = createOpenAI({ apiKey, baseURL: baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1' });
    return qwen(model || 'qwen-plus');
  }

  // Default to OpenAI
  const openai = createOpenAI({ apiKey });
  return openai(model || 'gpt-4o');
}

function getSystemPrompt(type: string, title: string): string {
  switch (type) {
    case 'TEST_PLAN':
      return `你是一位资深测试经理，精通各类测试策略和方法论。请根据需求生成专业、可执行的测试计划。`;
    case 'TEST_CASES':
      return `你是一位测试用例设计专家，精通等价类划分、边界值分析、正交试验等测试用例设计方法。请生成详细、可执行的测试用例。`;
    case 'TEST_SCRIPT':
      return `你是一位资深自动化测试开发工程师，精通 Python (pytest/unittest/Playwright/Selenium)、TypeScript (Playwright/Cypress)、Java (TestNG/Selenium) 等自动化测试框架。

请生成完整、可直接运行的自动化测试代码。要求：
- 代码必须完整，包含所有必要的 import 和初始化
- 使用适当的等待机制，避免硬编码 sleep
- 添加合理的断言和错误处理
- 遵循所选框架的最佳实践`;
    case 'CODE_REVIEW':
      return `你是一位代码审查专家，请对提供的测试脚本进行审查。从功能性、可维护性、可靠性、性能、安全性等维度分析，指出问题并给出修改建议。`;
    case 'EXPLAIN_CODE':
      return `你是一位编程导师，请详细解释提供的代码。说明其功能、逻辑流程、关键步骤和设计意图。用中文回答，技术术语保留英文。`;
    case 'OPTIMIZE_CODE':
      return `你是一位代码优化专家，请优化提供的代码。重点提升性能、可读性和健壮性。输出优化后的完整代码，并在开头简要说明改动点。`;
    case 'REQUIREMENT_ANALYSIS':
      return `你是一位资深 QA 架构师，精通需求分析与评审。请识别需求中的模糊点、潜在冲突、遗漏的边界条件，并给出验收标准与改进建议。`;
    case 'TEST_POINTS':
      return `你是一位测试设计专家。请基于需求生成覆盖正常、边界、异常场景的测试点清单。`;
    case 'AC_GENERATION':
      return `你是一位 QA 架构师，请基于需求生成 Gherkin（Given-When-Then）格式的验收标准。`;
    default:
      return '你是一位专业的软件测试工程师。';
  }
}

function buildUserPrompt(type: string, params: any): string {
  const title = params?.title || '';
  const code = params?.code || '';
  const description = params?.description || '';
  const language = params?.language || '';

  switch (type) {
    case 'TEST_PLAN':
      return `请为以下需求生成详细的测试计划：

需求标题：${title}
需求描述：${description || code}

请输出包含以下内容的测试计划：
1. 测试目标
2. 测试范围（功能、性能、安全、兼容性）
3. 测试策略
4. 测试环境要求
5. 风险评估
6. 时间估算`;

    case 'TEST_CASES':
      return `请为以下需求生成测试用例：

需求标题：${title}
需求描述：${description || code}

请使用等价类划分和边界值分析方法，生成至少 10 个测试用例，覆盖正常流程、边界条件和异常场景。`;

    case 'TEST_SCRIPT':
      if (description) {
        return `请根据以下描述生成自动化测试脚本：

目标：${description}
语言/框架：${language || 'Python + pytest'}
当前文件名：${title}

${code ? `当前代码（可作为参考）：\n\`\`\`\n${code}\n\`\`\`` : ''}

请生成完整的测试脚本。`;
      }
      return `请优化/重写以下测试脚本：

当前代码：
\`\`\`
${code}
\`\`\`

语言/框架：${language || 'Python + pytest'}
文件名：${title}

请生成优化后的完整测试脚本。`;

    case 'CODE_REVIEW':
      return `请审查以下测试代码：

文件名：${title}

\`\`\`
${code}
\`\`\`

${description ? `审查重点：${description}` : '请全面审查代码质量。'}`;

    case 'EXPLAIN_CODE':
      return `请解释以下代码：

文件名：${title}

\`\`\`
${code}
\`\`\`

${description ? `关注点：${description}` : ''}`;

    case 'OPTIMIZE_CODE':
      return `请优化以下代码：

文件名：${title}

\`\`\`
${code}
\`\`\`

${description ? `优化方向：${description}` : '请提升性能、可读性和健壮性。'}

请输出优化后的完整代码。`;

    case 'REQUIREMENT_ANALYSIS':
      return `请分析以下需求并给出结构化诊断，至少包含：清晰度评分(0-10)、模糊点、潜在冲突、遗漏的边界条件、改进建议，以及 Given-When-Then 验收标准：

需求标题：${title}
需求描述：${description || code || '无'}`;

    case 'TEST_POINTS':
      return `请为以下需求生成测试点清单，每行一个、以"- "开头，覆盖正常流程、边界条件与异常场景（如断网、并发、非法输入）：

需求标题：${title}
需求描述：${description || code || '无'}`;

    case 'AC_GENERATION':
      return `请为以下需求生成 Gherkin（Given-When-Then）格式的验收标准：

需求标题：${title}
需求描述：${description || code || '无'}`;

    default:
      return description || code || title;
  }
}

export class AIService {
  async testConnection(provider: string, apiKey: string): Promise<string> {
    console.log(`Testing connection to ${provider} with API key ${apiKey ? 'provided' : 'not provided'}`);

    try {
      const model = getModel(provider, apiKey);
      const { text } = await generateText({
        model,
        prompt: 'Reply with "OK" only.',
        maxTokens: 10,
      });
      return `Connection to ${provider} successful: ${text.trim()}`;
    } catch (error: any) {
      throw new Error(`Connection to ${provider} failed: ${error.message}`);
    }
  }

  async generateTestPlan(requirement: any, apiKey: string, settings?: any): Promise<any> {
    return this.generateContent({
      type: 'TEST_PLAN',
      requirement,
      aiProvider: settings?.aiProvider || 'OPENAI',
      projectId: '',
    }, apiKey, settings);
  }

  async generateTestCases(requirement: any, apiKey: string, settings?: any): Promise<any> {
    return this.generateContent({
      type: 'TEST_CASES',
      requirement,
      aiProvider: settings?.aiProvider || 'OPENAI',
      projectId: '',
    }, apiKey, settings);
  }

  async generateTestScript(testCase: any, apiKey: string, settings?: any): Promise<any> {
    return this.generateContent({
      type: 'TEST_SCRIPT',
      requirement: testCase?.requirement || testCase,
      aiProvider: settings?.aiProvider || 'OPENAI',
      projectId: '',
    }, apiKey, settings);
  }

  async generateContent(params: AIContentParams, apiKey: string, extraSettings?: any) {
    const provider = params.aiProvider || extraSettings?.aiProvider || 'OPENAI';
    const type = params.type || 'TEST_PLAN';

    const model = getModel(provider, apiKey, extraSettings?.baseUrl, extraSettings?.model);
    const systemPrompt = getSystemPrompt(type, params.requirement?.title || '');
    const userPrompt = buildUserPrompt(type, params.requirement);

    const { text } = await generateText({
      model: model as any,
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: extraSettings?.maxTokens || 2000,
      temperature: extraSettings?.temperature ?? 0.7,
    });

    return {
      type: params.type,
      content: text,
      timestamp: new Date().toISOString(),
    };
  }
}

export const aiService = new AIService();
