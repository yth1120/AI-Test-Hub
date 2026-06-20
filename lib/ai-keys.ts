/**
 * 团队版 AI Key 解析
 *
 * 桌面版把 Key 存在 OS keychain（keytar）；团队版统一由服务端环境变量按 provider 提供。
 * 同时支持 per-project 在 project_settings 覆盖（如未来加列），当前优先 env。
 */

const ENV_KEY_MAP: Record<string, string> = {
  OPENAI: 'OPENAI_API_KEY',
  ANTHROPIC: 'ANTHROPIC_API_KEY',
  GOOGLE: 'GOOGLE_GENERATIVE_AI_API_KEY',
  DEEPSEEK: 'DEEPSEEK_API_KEY',
  KIMI: 'KIMI_API_KEY',
  QWEN: 'QWEN_API_KEY',
};

/** 按 provider 返回服务端环境变量里的 API Key；未配置返回空串。 */
export function resolveApiKey(provider?: string): string {
  const p = (provider || 'OPENAI').toUpperCase();
  const envName = ENV_KEY_MAP[p] || 'OPENAI_API_KEY';
  return process.env[envName] || '';
}
