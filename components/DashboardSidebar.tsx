'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SquaresFour, FileText, Flask, Bug, ChartBar, Gear,
  SealCheck, Code, SidebarSimple, Sun, Moon, Brain, Folders,
  LinkSimple, Play, LinkBreak, ClipboardText,
} from '@phosphor-icons/react';

interface SidebarProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', href: '/', icon: SquaresFour, label: '仪表盘' },
  { id: 'projects', href: '/projects', icon: Folders, label: '项目管理' },
  { id: 'requirements', href: '/requirements', icon: FileText, label: '需求管理' },
  { id: 'test-cases', href: '/test-cases', icon: Flask, label: '测试用例' },
  { id: 'test-plans', href: '/test-plans', icon: ClipboardText, label: '测试计划' },
  { id: 'defects', href: '/defects', icon: Bug, label: '缺陷跟踪' },
  { id: 'execution-rounds', href: '/execution-rounds', icon: Play, label: '执行轮次' },
  { id: 'traceability', href: '/traceability', icon: LinkSimple, label: '追溯矩阵' },
  { id: 'scripts', href: '/scripts', icon: Code, label: '脚本工作区' },
  { id: 'agent', href: '/agent', icon: Brain, label: 'Agent 工作流' },
  { id: 'reports', href: '/reports', icon: ChartBar, label: '测试报告' },
  { id: 'settings', href: '/settings', icon: Gear, label: '项目设置' },
  { id: 'integrations', href: '/integrations', icon: LinkBreak, label: '集成' },
];

export default function DashboardSidebar({ theme, onThemeToggle }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(href: string): boolean {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside
      className={`${collapsed ? 'w-14' : 'w-48'} bg-surface border-r border-line flex flex-col h-screen shrink-0 transition-[width] duration-200 overflow-hidden`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center border-b border-line pl-2.5 whitespace-nowrap">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
          <SealCheck size={18} className="text-white" />
        </div>
        <span className={`font-semibold text-[15px] ml-2.5 text-ink tracking-tight shrink-0 transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
          AI TestHub
        </span>
      </div>

      {/* Nav — 布局恒定，图标位置展开/收缩完全一致 */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden px-2.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center rounded-lg text-sm font-medium gap-3 pl-2.5 pr-3 py-2 ${
                active
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              {active && (
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[2px] rounded-r bg-accent transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`} />
              )}
              <Icon size={18} className="shrink-0" />
              <span className={`whitespace-nowrap shrink-0 transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="py-3 border-t border-line space-y-0.5 px-2.5">
        <button
          onClick={onThemeToggle}
          title={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
          className="w-full flex items-center rounded-lg gap-3 pl-2.5 pr-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink transition-colors"
        >
          {theme === 'dark' ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
          <span className={`whitespace-nowrap shrink-0 transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
            {theme === 'dark' ? '亮色模式' : '暗色模式'}
          </span>
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center rounded-lg gap-3 pl-2.5 pr-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-ink transition-colors"
        >
          <SidebarSimple size={18} className="shrink-0" />
          <span className={`whitespace-nowrap shrink-0 transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
            收起侧栏
          </span>
        </button>
      </div>
    </aside>
  );
}
