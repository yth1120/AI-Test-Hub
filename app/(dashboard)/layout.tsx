'use client';

/**
 * Dashboard 布局
 *
 * 初始化 electronAPI polyfill，挂载 ProjectProvider + SettingsProvider，
 * 渲染侧边栏 + 顶栏 + 页面内容。
 */

import '@/../lib/electron-api-polyfill';
import { useState, useEffect } from 'react';
import { ProjectProvider } from '@/renderer/hooks/useProject';
import { SettingsProvider } from '@/renderer/hooks/useSettingsContext';
import DashboardSidebar from '@/../components/DashboardSidebar';
import GlobalSearch from '@/../components/GlobalSearch';
import NotificationBell from '@/../components/NotificationBell';
import { useProject } from '@/renderer/hooks/useProject';
import { useSession, signOut } from 'next-auth/react';
import { SignOut } from '@phosphor-icons/react';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { currentProject } = useProject();
  const { data: session } = useSession();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // 从 localStorage 恢复主题
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <DashboardSidebar theme={theme} onThemeToggle={toggleTheme} />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 bg-surface border-b border-line flex items-center justify-between px-6 shrink-0">
          <div className="flex text-sm text-muted shrink-0">
            <span>当前项目：</span>
            <span className="font-semibold text-ink ml-1 hover:text-accent cursor-pointer transition-colors">
              {currentProject?.name || '暂无项目'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {currentProject?.id && <GlobalSearch projectId={currentProject.id} />}
            <NotificationBell />
            <span className="text-xs text-muted">
              {session?.user?.name || session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-rose-500 transition-colors"
            >
              <SignOut size={14} />
              退出
            </button>
          </div>
        </div>

        <main className="flex-1 min-h-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectProvider>
      <SettingsProvider>
        <DashboardContent>{children}</DashboardContent>
      </SettingsProvider>
    </ProjectProvider>
  );
}
