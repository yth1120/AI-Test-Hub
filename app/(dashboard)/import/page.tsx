'use client';

/**
 * Excel/CSV 导入页面
 *
 * 上传文件 → 预览 → 字段映射 → 导入
 */

import { useState } from 'react';
import { useProject } from '@/renderer/hooks/useProject';
import { UploadSimple, FileXls, CheckCircle, XCircle, DownloadSimple } from '@phosphor-icons/react';
import Link from 'next/link';

interface ImportResult {
  success: number;
  failed: number;
  errors?: string[];
}

export default function ImportPage() {
  const { currentProject } = useProject();
  const [importType, setImportType] = useState<'Requirement' | 'TestCase'>('Requirement');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleImport() {
    if (!file || !currentProject?.id) return;
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', importType);

    try {
      const res = await fetch(`/api/projects/${currentProject.id}/import`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ success: 0, failed: 1, errors: [err.message] });
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv'))) {
      setFile(f);
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">数据导入</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">从 Excel (xlsx/xls) 或 CSV 文件批量导入需求或测试用例</p>
        </div>

        {/* 导入类型选择 */}
        <div className="flex gap-3">
          <button
            onClick={() => { setImportType('Requirement'); setResult(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              importType === 'Requirement'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            导入需求
          </button>
          <button
            onClick={() => { setImportType('TestCase'); setResult(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              importType === 'TestCase'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            导入测试用例
          </button>
        </div>

        {/* 文件上传区 */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`card p-12 text-center border-2 border-dashed transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-slate-300 dark:border-slate-600'
          }`}
        >
          <FileXls size={48} className="mx-auto mb-4 text-slate-400" />
          {file ? (
            <div className="space-y-2">
              <p className="font-medium text-slate-900 dark:text-white">{file.name}</p>
              <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              <button onClick={() => setFile(null)} className="text-sm text-red-500 hover:text-red-600">移除</button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-600 dark:text-slate-400">拖拽文件到此处，或</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors">
                <UploadSimple size={16} />
                选择文件
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }}
                />
              </label>
              <p className="text-xs text-slate-400 mt-2">支持 .xlsx / .xls / .csv 格式，最大 10MB</p>
            </div>
          )}
        </div>

        {/* 模板下载 */}
        <div className="flex gap-4 text-sm">
          <Link
            href={`/api/projects/${currentProject?.id || 'demo'}/import?template=requirement`}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-500"
            onClick={(e) => e.preventDefault()}
          >
            <DownloadSimple size={14} /> 下载需求导入模板
          </Link>
          <Link
            href={`/api/projects/${currentProject?.id || 'demo'}/import?template=testcase`}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-500"
            onClick={(e) => e.preventDefault()}
          >
            <DownloadSimple size={14} /> 下载用例导入模板
          </Link>
        </div>

        {/* 导入按钮 */}
        {file && (
          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '导入中…' : `开始导入 ${importType === 'Requirement' ? '需求' : '测试用例'}`}
          </button>
        )}

        {/* 导入结果 */}
        {result && (
          <div className={`card p-6 border-l-4 ${result.failed > 0 ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
            <div className="flex items-center gap-3 mb-3">
              {result.failed === 0 ? (
                <CheckCircle size={20} className="text-emerald-500" />
              ) : (
                <XCircle size={20} className="text-amber-500" />
              )}
              <span className="font-semibold text-slate-900 dark:text-white">
                成功 {result.success} 条，失败 {result.failed} 条
              </span>
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-3 text-sm">
                <p className="font-medium text-red-600 dark:text-red-400 mb-2">错误详情：</p>
                <ul className="list-disc list-inside space-y-1 text-red-600 dark:text-red-400">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
