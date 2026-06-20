/**
 * Auth.js (NextAuth v4) App Router 路由处理器
 *
 * 所有 /api/auth/* 请求（登录、登出、会话、CSRF 等）由 NextAuth 统一处理。
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/../lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
