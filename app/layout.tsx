import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import SessionProvider from '@/../components/SessionProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'TestHub Pro — 团队需求管理系统',
  description: 'AI 驱动的软件测试需求管理工具，支持团队协作、需求追溯、AI 辅助生成',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-canvas text-ink antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
