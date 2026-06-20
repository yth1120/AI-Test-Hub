import React, { useEffect, useRef, useState } from 'react';
import { Paperclip, UploadSimple, Trash, FileText, Image as ImageIcon, DownloadSimple } from '@phosphor-icons/react';
import { useProject } from '../hooks/useProject';

interface Attachment {
  id: string;
  filename: string;
  storedPath: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploader?: { name?: string; email?: string } | null;
}

interface AttachmentPanelProps {
  targetType: 'Requirement' | 'TestCase' | 'Defect';
  targetId: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isImage(mime: string): boolean {
  return mime.startsWith('image/');
}

/**
 * 通用附件面板：列出、上传、删除某实体的附件。
 * 走 window.electronAPI（团队版由 api-client polyfill 提供，桌面版为占位）。
 */
export const AttachmentPanel: React.FC<AttachmentPanelProps> = ({ targetType, targetId }) => {
  const { currentProject } = useProject();
  const projectId = currentProject?.id || '';
  const [items, setItems] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const api = (typeof window !== 'undefined' ? (window as any).electronAPI : null);

  const load = () => {
    if (!projectId || !api?.getAttachments) return;
    api.getAttachments(projectId, targetType, targetId).then(setItems).catch(() => setItems([]));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, targetType, targetId]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !api?.uploadAttachment) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        await api.uploadAttachment(projectId, targetType, targetId, file);
      }
      load();
    } catch (e: any) {
      setError(e?.message || '上传失败');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDelete(id: string) {
    if (!api?.deleteAttachment) return;
    if (!confirm('确认删除该附件？')) return;
    await api.deleteAttachment(id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Paperclip size={15} /> 附件{items.length > 0 && `（${items.length}）`}
        </span>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 transition-colors"
        >
          <UploadSimple size={14} /> {uploading ? '上传中…' : '上传'}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}

      {items.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 py-2">暂无附件，点击「上传」添加截图或文件（≤10MB）</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((att) => (
            <li key={att.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800/50 text-sm group">
              {isImage(att.mimeType)
                ? <ImageIcon size={16} className="text-slate-400 shrink-0" />
                : <FileText size={16} className="text-slate-400 shrink-0" />}
              <a
                href={`/${att.storedPath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-300 hover:text-accent"
                title={att.filename}
              >
                {att.filename}
              </a>
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{formatSize(att.size)}</span>
              <a
                href={`/${att.storedPath}`}
                download={att.filename}
                className="p-1 text-slate-400 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                title="下载"
              >
                <DownloadSimple size={14} />
              </a>
              <button
                onClick={() => handleDelete(att.id)}
                className="p-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="删除"
              >
                <Trash size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
