import React, { useState, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { FloppyDisk, Copy, DownloadSimple, Play, Bug, Code } from '@phosphor-icons/react';

interface CodeEditorProps {
  initialContent?: string;
  value?: string;
  language?: string;
  fileName?: string;
  onSave?: (content: string) => void;
  readOnly?: boolean;
  streaming?: boolean;
}

export default function CodeEditor({
  initialContent = '',
  value: controlledValue,
  language = 'python',
  fileName = 'script.py',
  onSave,
  readOnly = false,
  streaming = false,
}: CodeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);

  // Sync from controlled value or initialContent
  useEffect(() => {
    if (controlledValue !== undefined) {
      setContent(controlledValue);
      if (!streaming) setIsDirty(true);
    }
  }, [controlledValue, streaming]);

  useEffect(() => {
    if (controlledValue === undefined) {
      setContent(initialContent);
      setIsDirty(false);
    }
  }, [initialContent, controlledValue]);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    setEditorInstance(editor);

    // Add custom commands
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
      () => handleFloppyDisk()
    );

    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyC,
      () => handleCopy()
    );
  };

  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setIsDirty(true);
    }
  };

  const handleFloppyDisk = () => {
    if (onSave) {
      onSave(content);
      setIsDirty(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const handleDownloadSimple = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRun = () => {
    // TODO: Implement code execution
    console.log('Running code:', content);
  };

  const handleDebug = () => {
    // TODO: Implement debug mode
    console.log('Debugging code:', content);
  };

  const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp';
      case 'c':
        return 'c';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'xml':
        return 'xml';
      case 'yaml':
      case 'yml':
        return 'yaml';
      default:
        return '';
    }
  };

  // Use prop language if provided, otherwise detect from filename
  const editorLanguage = language || getLanguageFromFileName(fileName);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <Code size={18} className="text-slate-500 mr-2" />
            <span className="text-sm font-medium text-slate-700">{fileName}</span>
            {isDirty && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                未保存
              </span>
            )}
          </div>
          <div className="flex items-center text-xs text-slate-500">
            <span className="px-2 py-0.5 bg-slate-100 rounded">{editorLanguage.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!readOnly && (
            <>
              <button
                onClick={handleFloppyDisk}
                disabled={!isDirty}
                className={`flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isDirty
                    ? 'bg-accent text-white hover:bg-accent/90'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <FloppyDisk size={16} className="mr-1.5" />
                保存
              </button>

              <button
                onClick={handleRun}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
              >
                <Play size={16} className="mr-1.5" />
                运行
              </button>

              <button
                onClick={handleDebug}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
              >
                <Bug size={16} className="mr-1.5" />
                调试
              </button>
            </>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            <Copy size={16} className="mr-1.5" />
            复制
          </button>

          <button
            onClick={handleDownloadSimple}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            <DownloadSimple size={16} className="mr-1.5" />
            下载
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={editorLanguage}
          value={content}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            formatOnPaste: true,
            formatOnType: true,
            tabSize: 2,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            snippetSuggestions: 'inline',
            folding: true,
            lineNumbers: 'on',
            glyphMargin: true,
            renderLineHighlight: 'all',
            renderWhitespace: 'selection',
            renderControlCharacters: true,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
            },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
          }}
          theme="vs-dark"
        />
      </div>

      {/* Editor Footer */}
      <div className="px-4 py-2 bg-slate-900 text-slate-300 text-xs border-t border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>行数: {content.split('\n').length}</span>
            <span>字符数: {content.length}</span>
            <span>编码: UTF-8</span>
            {streaming && (
              <span className="flex items-center text-purple-400">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse mr-1.5"></span>
                AI 正在生成...
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {!readOnly && (
              <span className="text-slate-400">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">Ctrl+S</kbd> 保存
              </span>
            )}
            <span className="text-slate-400">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">Ctrl+C</kbd> 复制
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}