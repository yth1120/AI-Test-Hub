'use client';

/**
 * 通知铃铛（团队版 TopBar）—— 轮询未读数，下拉显示通知，可标记已读并跳转。
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check } from '@phosphor-icons/react';
import { apiClient } from '@/../lib/api-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  targetType: string | null;
  targetId: string | null;
  read: boolean;
  createdAt: string;
}

const TARGET_ROUTES: Record<string, string> = {
  Requirement: '/requirements',
  TestCase: '/test-cases',
  Defect: '/defects',
};

export default function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = () => {
    apiClient.getNotifications({ limit: 20 })
      .then((r) => { setItems(r.items); setUnread(r.unreadCount); })
      .catch(() => {});
  };

  // 初次加载 + 轮询（30s）
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markAllRead() {
    await apiClient.markNotificationsRead();
    load();
  }

  async function openItem(n: Notification) {
    if (!n.read) await apiClient.markNotificationsRead(n.id);
    setOpen(false);
    if (n.targetType && TARGET_ROUTES[n.targetType]) {
      router.push(TARGET_ROUTES[n.targetType]);
    }
    load();
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 text-muted hover:text-ink transition-colors"
        title="通知"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-rose-500 rounded-full">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 max-h-[70vh] overflow-auto bg-surface border border-line rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-line sticky top-0 bg-surface">
            <span className="text-sm font-medium text-ink">通知</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-accent hover:underline">
                <Check size={12} /> 全部已读
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted text-center">暂无通知</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={`w-full text-left px-4 py-2.5 border-b border-line/50 hover:bg-surface-2 transition-colors ${n.read ? '' : 'bg-accent/5'}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-muted mt-0.5 truncate">{n.body}</p>}
                    <p className="text-[11px] text-muted mt-1">{new Date(n.createdAt).toLocaleString('zh-CN')}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
