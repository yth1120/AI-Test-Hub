/**
 * Webhook 鉴权工具
 *
 * 统一从 `WEBHOOK_SECRET` 环境变量取密钥（未配置则拒绝所有入站 webhook）。
 * - junit：URL `?secret=` 明文比对（常时比较防时序攻击）
 * - github：`x-hub-signature-256` HMAC-SHA256 校验（GitHub 标准），
 *           若未带签名则回退到 `?secret=` 明文（便于手动触发）。
 */

import crypto from 'crypto';

/** 常时字符串比较，避免时序侧信道。 */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** 取配置的 webhook 密钥；未配置返回 null（调用方应拒绝请求）。 */
export function getWebhookSecret(): string | null {
  const s = process.env.WEBHOOK_SECRET;
  return s && s.trim() ? s : null;
}

/** 校验明文 secret（junit / 手动触发）。 */
export function verifyPlainSecret(provided: string | null): boolean {
  const secret = getWebhookSecret();
  if (!secret || !provided) return false;
  return safeEqual(provided, secret);
}

/**
 * 校验 GitHub HMAC 签名（x-hub-signature-256: sha256=...）。
 * rawBody 必须是原始请求体字符串。
 */
export function verifyGithubSignature(signatureHeader: string | null, rawBody: string): boolean {
  const secret = getWebhookSecret();
  if (!secret || !signatureHeader) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // 长度不等时 safeEqual 直接返回 false
  return safeEqual(signatureHeader, expected);
}
