'use client';

/**
 * 评论区域组件
 *
 * 可嵌入需求/用例/缺陷详情页，显示评论列表 + 发表新评论 + 回复。
 *
 * Props:
 *   targetType: 'Requirement' | 'TestCase' | 'Defect'
 *   targetId: string
 *   projectId: string
 */

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/../lib/api-client';
import { ChatText, ArrowBendUpLeft } from '@phosphor-icons/react';

interface CommentUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Comment {
  id: string;
  content: string;
  user: CommentUser;
  createdAt: string;
  replies?: Comment[];
}

interface Props {
  targetType: string;
  targetId: string;
  projectId: string;
}

export default function CommentSection({ targetType, targetId, projectId }: Props) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setArrowBendUpLeftingTo] = useState<string | null>(null);
  const [replyText, setArrowBendUpLeftText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [targetType, targetId]);

  function loadComments() {
    setLoading(true);
    apiClient.getComments(targetType, targetId).then(setComments).finally(() => setLoading(false));
  }

  async function handleSubmit(parentId?: string) {
    const content = parentId ? replyText : newComment;
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await apiClient.createComment({ content: content.trim(), targetType, targetId, projectId, parentId });
      if (parentId) {
        setArrowBendUpLeftText('');
        setArrowBendUpLeftingTo(null);
      } else {
        setNewComment('');
      }
      loadComments();
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return d.toLocaleDateString('zh-CN');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <ChatText size={16} />
        评论 ({comments.length})
      </div>

      {/* 发表评论 */}
      {session && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(session.user?.name || session.user?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="flex-1 space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="添加评论…"
              rows={2}
              className="input text-sm resize-none"
            />
            <div className="flex justify-end">
              <button
                onClick={() => handleSubmit()}
                disabled={submitting || !newComment.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? '发送中…' : '发表'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 评论列表 */}
      {loading ? (
        <p className="text-sm text-slate-400">加载中…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-400">暂无评论</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="space-y-2">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-surface-2 text-muted flex items-center justify-center text-xs font-bold shrink-0">
                  {(c.user.name || c.user.email)[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {c.user.name || c.user.email}
                    </span>
                    <span className="text-xs text-slate-400">{formatTime(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                    {c.content}
                  </p>
                  <button
                    onClick={() => setArrowBendUpLeftingTo(replyingTo === c.id ? null : c.id)}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 mt-1 transition-colors"
                  >
                    <ArrowBendUpLeft size={12} /> 回复
                  </button>

                  {/* 回复输入框 */}
                  {replyingTo === c.id && session && (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setArrowBendUpLeftText(e.target.value)}
                        placeholder="输入回复…"
                        className="input text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit(c.id)}
                      />
                      <button
                        onClick={() => handleSubmit(c.id)}
                        disabled={submitting || !replyText.trim()}
                        className="px-3 py-1 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
                      >
                        回复
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 回复列表 */}
              {c.replies && c.replies.length > 0 && (
                <div className="ml-10 space-y-2 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                  {c.replies.map((r) => (
                    <div key={r.id} className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-surface-2 text-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                        {(r.user.name || r.user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {r.user.name || r.user.email}
                          </span>
                          <span className="text-xs text-slate-400">{formatTime(r.createdAt)}</span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
