'use client';

/**
 * 全局搜索框（团队版 TopBar）—— 跨需求/用例/缺陷/计划检索，结果下拉跳转。
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlass, FileText, Flask, Bug, ClipboardText } from '@phosphor-icons/react';
import { apiClient } from '@/../lib/api-client';

interface SearchResults {
  requirements: any[];
  testCases: any[];
  defects: any[];
  testPlans: any[];
}

const EMPTY: SearchResults = { requirements: [], testCases: [], defects: [], testPlans: [] };

// 每组：图标 + 跳转路由
const GROUPS: { key: keyof SearchResults; label: string; icon: any; href: string }[] = [
  { key: 'requirements', label: '需求', icon: FileText, href: '/requirements' },
  { key: 'testCases', label: '用例', icon: Flask, href: '/test-cases' },
  { key: 'defects', label: '缺陷', icon: Bug, href: '/defects' },
  { key: 'testPlans', label: '计划', icon: ClipboardText, href: '/test-plans' },
];

export default function GlobalSearch({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // 防抖搜索
  useEffect(() => {
    if (!q.trim() || !projectId) {
      setResults(EMPTY);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      apiClient.search(projectId, q.trim())
        .then((r) => { setResults(r); setOpen(true); })
        .catch(() => setResults(EMPTY))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, projectId]);

  // 点击外部关闭
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const total = GROUPS.reduce((sum, g) => sum + results[g.key].length, 0);

  function go(href: string) {
    setOpen(false);
    setQ('');
    router.push(href);
  }

  return (
    <div ref={boxRef} className="relative">
      <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (total > 0) setOpen(true); }}
        placeholder="搜索需求、用例、缺陷..."
        className="w-48 md:w-64 lg:w-80 pl-9 pr-4 py-1.5 bg-surface border border-line rounded-lg text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
      />

      {open && q.trim() && (
        <div className="absolute right-0 mt-1 w-80 max-h-[70vh] overflow-auto bg-surface border border-line rounded-lg shadow-lg z-50">
          {loading && <div className="px-4 py-3 text-sm text-muted">搜索中…</div>}
          {!loading && total === 0 && (
            <div className="px-4 py-3 text-sm text-muted">未找到匹配「{q}」的内容</div>
          )}
          {!loading && GROUPS.map((g) => {
            const items = results[g.key];
            if (!items.length) return null;
            const Icon = g.icon;
            return (
              <div key={g.key} className="py-1">
                <div className="px-3 py-1 text-xs font-medium text-muted uppercase">{g.label}（{items.length}）</div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => go(g.href)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-surface-2 text-left"
                  >
                    <Icon size={15} className="text-muted shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
