/**
 * electronAPI 浏览器端 polyfill
 *
 * 将 apiClient 挂载到 window.electronAPI，让现有 src/ 下的 hooks 和组件
 * 无需任何修改即可在 Next.js 浏览器环境中运行。
 *
 * 条件：仅在浏览器端执行（typeof window !== 'undefined'）。
 * 使用方式：在 dashboard layout.tsx 中 import './electron-api-polyfill'。
 */

import { apiClient } from './api-client';

if (typeof window !== 'undefined') {
  (window as any).electronAPI = apiClient;
}

export {};
