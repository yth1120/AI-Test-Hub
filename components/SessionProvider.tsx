'use client';

/**
 * Auth.js SessionProvider 客户端包装
 *
 * 包裹在 layout.tsx 中，让客户端组件可以通过 useSession() 访问登录状态。
 */

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

export default function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
