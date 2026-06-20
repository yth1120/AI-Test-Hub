/**
 * Next.js 中间件 —— 路由保护
 *
 * 未登录用户重定向到 /login（放行 /login、/register、/api/auth/*、静态资源）。
 */

export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    // 需要登录才能访问的路径（包括首页 dashboard）
    '/',
    '/projects/:path*',
    '/requirements/:path*',
    '/test-cases/:path*',
    '/test-plans/:path*',
    '/defects/:path*',
    '/reports/:path*',
    '/dashboard/:path*',
    '/settings/:path*',
    '/scripts/:path*',
    '/agent/:path*',
    '/traceability/:path*',
    '/execution-rounds/:path*',
    '/integrations/:path*',
    '/import/:path*',
  ],
};
