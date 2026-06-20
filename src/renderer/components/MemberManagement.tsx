import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Trash, Crown } from '@phosphor-icons/react';
import { useProject } from '../hooks/useProject';

interface Member {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string | null; email: string; image: string | null };
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: '管理员' },
  { value: 'PM', label: '项目经理' },
  { value: 'QA', label: '测试' },
  { value: 'DEV', label: '开发' },
  { value: 'VIEWER', label: '只读' },
];

const roleLabel = (r: string) => ROLE_OPTIONS.find((o) => o.value === r)?.label || r;

/**
 * 团队成员管理（项目设置内）。
 * ADMIN 可加/改/删；其他角色只读查看名单。
 */
export const MemberManagement: React.FC = () => {
  const { currentProject } = useProject();
  const projectId = currentProject?.id || '';
  const api = (typeof window !== 'undefined' ? (window as any).electronAPI : null);

  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('QA');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // 当前登录用户在本项目的角色（决定能否管理）
  const myRole = members.find((m) => m.userId === currentUserId)?.role;
  const isAdmin = myRole === 'ADMIN';

  const load = () => {
    if (!projectId || !api?.getProjectMembers) return;
    api.getProjectMembers(projectId).then(setMembers).catch(() => setMembers([]));
  };

  useEffect(() => {
    // 取当前用户 id（用于判断自己是否 ADMIN）
    fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => r.json())
      .then((s) => setCurrentUserId(s?.user?.id || ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleAdd() {
    if (!email.trim() || !api?.addProjectMember) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api.addProjectMember(projectId, email.trim(), role);
      setEmail('');
      setNotice('成员已添加');
      load();
    } catch (e: any) {
      setError(e?.message || '添加失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setError('');
    try {
      await api.updateMemberRole(projectId, userId, newRole);
      load();
    } catch (e: any) {
      setError(e?.message || '修改角色失败');
      load();
    }
  }

  async function handleRemove(m: Member) {
    if (!confirm(`确认将 ${m.user.name || m.user.email} 移出项目？`)) return;
    setError('');
    try {
      await api.removeProjectMember(projectId, m.userId);
      load();
    } catch (e: any) {
      setError(e?.message || '移除失败');
    }
  }

  return (
    <div className="col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
      <div className="flex items-center mb-4">
        <Users className="text-accent mr-2" size={20} />
        <h2 className="text-lg font-semibold">团队成员</h2>
        <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">（{members.length}）</span>
      </div>

      {!isAdmin && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          仅项目管理员可添加/修改成员。下方为当前成员名单。
        </p>
      )}

      {/* 添加成员（仅 ADMIN）*/}
      {isAdmin && (
        <div className="flex flex-wrap items-end gap-3 mb-5 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">成员邮箱（需对方已注册）</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">角色</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={busy || !email.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
          >
            <UserPlus size={16} /> {busy ? '添加中…' : '添加成员'}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
      {notice && <p className="text-sm text-emerald-600 mb-3">{notice}</p>}

      {/* 成员列表 */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {members.map((m) => {
          const isOwner = currentProject && (currentProject as any).ownerId === m.userId;
          return (
            <div key={m.id} className="flex items-center gap-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-semibold shrink-0">
                {(m.user.name || m.user.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{m.user.name || m.user.email}</span>
                  {isOwner && <Crown size={13} className="text-amber-500 shrink-0" />}
                  {m.userId === currentUserId && <span className="text-xs text-slate-400">(你)</span>}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.user.email}</div>
              </div>

              {isAdmin ? (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{roleLabel(m.role)}</span>
              )}

              {isAdmin && !isOwner && (
                <button
                  onClick={() => handleRemove(m)}
                  title="移出项目"
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash size={15} />
                </button>
              )}
            </div>
          );
        })}
        {members.length === 0 && (
          <p className="py-4 text-sm text-slate-400 dark:text-slate-500 text-center">暂无成员</p>
        )}
      </div>
    </div>
  );
};
