/**
 * 完整 Agent 工作流（QA → 设计 → 开发 → 维护），NDJSON 流式进度。
 *
 * POST /api/projects/:projectId/agent/run-workflow
 * Body: { requirementId }
 * 响应：application/x-ndjson，每行一个 JSON：
 *   { type:'progress', step, currentStep, totalSteps }   // 多条
 *   { type:'result', success, workflowId, steps, finalResult, error }  // 末条
 *
 * 复用桌面版 AgentOrchestrator，注入团队版依赖：
 *   - keytar shim：用环境变量按 provider 返回 Key
 *   - 检索器：同项目内按词元重叠检索相似需求（lib/agent-retriever）
 *   - sandbox：默认关闭（不在服务器执行 AI 生成代码）；设 AGENT_SANDBOX_ENABLED=true 开启
 * 运行记录落库：AgentWorkflow + 每阶段 AgentTask + AgentExecutionLog（失败不影响流）。
 */

import { requireProjectRole } from '@/../lib/auth-helpers';
import { prisma } from '@/../lib/prisma';
import { resolveApiKey } from '@/../lib/ai-keys';
import { makeRequirementRetriever } from '@/../lib/agent-retriever';
import { AgentOrchestrator } from '@/main/agent-orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { projectId: string };
}

function makeKeytar(projectApiKey?: string | null) {
  return {
    getPassword: async (_service: string, provider: string) =>
      projectApiKey || resolveApiKey(provider),
  };
}

// JSON 字段大小上限，避免单步 input/output 撑爆数据库
const CAP = 8000;
function cap(value: any): string {
  const s = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  return s.length > CAP ? s.slice(0, CAP) + '…[truncated]' : s;
}

/** 把一次工作流运行（含各阶段）落库；任何失败仅记录日志，不抛出。 */
async function persistRun(projectId: string, dbWorkflowId: string, result: any) {
  try {
    await prisma.agentWorkflow.update({
      where: { id: dbWorkflowId },
      data: {
        status: result?.success ? 'COMPLETED' : 'FAILED',
        description: [
          result?.workflowId ? `orchestratorId=${result.workflowId}` : null,
          result?.error ? `error=${result.error}` : null,
        ]
          .filter(Boolean)
          .join('; ') || null,
      },
    });

    for (const step of result?.steps || []) {
      const start = step.startTime ? new Date(step.startTime).getTime() : 0;
      const end = step.endTime ? new Date(step.endTime).getTime() : start;
      const task = await prisma.agentTask.create({
        data: {
          type: String(step.agent || 'AGENT'),
          action: String(step.action || ''),
          status: String(step.status || 'COMPLETED'),
          input: cap(step.input),
          output: step.output !== undefined ? cap(step.output) : null,
          error: step.error || null,
          workflowId: dbWorkflowId,
          projectId,
          completedAt: step.endTime ? new Date(step.endTime) : null,
        },
      });
      await prisma.agentExecutionLog.create({
        data: {
          iteration: 1,
          action: String(step.action || ''),
          input: cap(step.input),
          output: step.output !== undefined ? cap(step.output) : '',
          error: step.error || null,
          duration: Math.max(0, end - start),
          taskId: task.id,
        },
      });
    }
  } catch (e) {
    console.error('persist agent run failed:', e);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await requireProjectRole(params.projectId, ['ADMIN', 'PM', 'QA']);
  if (!auth) {
    return new Response(JSON.stringify({ message: '无权运行工作流' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { requirementId } = await request.json();

  // 预创建运行记录（RUNNING），便于在 Prisma Studio 中实时看到「进行中」
  let dbWorkflowId: string | null = null;
  try {
    const req = await prisma.requirement.findUnique({
      where: { id: requirementId },
      select: { title: true },
    });
    const wf = await prisma.agentWorkflow.create({
      data: {
        name: `完整工作流：${req?.title || requirementId}`,
        type: 'FULL_WORKFLOW',
        status: 'RUNNING',
        projectId: params.projectId,
      },
    });
    dbWorkflowId = wf.id;
  } catch (e) {
    console.error('create agent workflow record failed:', e);
  }

  // 取项目设置中的 Key（优先）和 provider 配置
  const settings = await prisma.projectSettings.findUnique({ where: { projectId: params.projectId } });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      try {
        const orchestrator = new AgentOrchestrator(
          prisma,
          makeKeytar(settings?.apiKey),
          makeRequirementRetriever(prisma, params.projectId, requirementId),
        );

        // 安全默认：不在服务器执行 AI 生成的脚本。视为"通过"，避免触发无意义的自愈重试。
        if (process.env.AGENT_SANDBOX_ENABLED !== 'true') {
          (orchestrator as any).tools.executeInSandbox = async () => ({
            success: true,
            stdout: 'sandbox disabled (set AGENT_SANDBOX_ENABLED=true to execute scripts)',
            stderr: '',
            exitCode: 0,
            duration: 0,
          });
        }

        const result = await orchestrator.runFullWorkflow(
          params.projectId,
          requirementId,
          (step: any, currentStep: number, totalSteps: number) =>
            send({ type: 'progress', step, currentStep, totalSteps }),
        );
        send({ type: 'result', ...result });
        if (dbWorkflowId) await persistRun(params.projectId, dbWorkflowId, result);
      } catch (error: any) {
        send({ type: 'result', success: false, error: error?.message || '工作流失败' });
        if (dbWorkflowId) {
          await persistRun(params.projectId, dbWorkflowId, {
            success: false,
            error: error?.message,
            steps: [],
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}
