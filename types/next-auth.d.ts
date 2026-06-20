/**
 * NextAuth 类型扩展
 *
 * JWT session 的 user 默认不包含 id。
 * 这里扩展 Session.user 使其包含 id，与 auth.callbacks.session 实际返回一致。
 */

import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
  }
}
