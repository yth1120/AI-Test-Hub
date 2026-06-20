import { useState, useEffect, useCallback } from 'react';
import type { TestScript } from '../../shared/types';
import { useProject } from './useProject';

export const useTestScripts = (projectId?: string) => {
  const { currentProject } = useProject();
  const effectiveProjectId = projectId || currentProject?.id || '';
  const [scripts, setScripts] = useState<TestScript[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!effectiveProjectId) return;
    try {
      if (window.electronAPI?.getTestScripts) {
        const data = await window.electronAPI.getTestScripts(effectiveProjectId);
        if (Array.isArray(data)) setScripts(data);
      }
    } catch (error) {
      console.error('Failed to fetch test scripts:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createScript = async (data: Partial<TestScript>) => {
    if (!effectiveProjectId) return;
    try {
      const result = await window.electronAPI?.createTestScript?.({ ...data, projectId: effectiveProjectId });
      if (result) {
        fetch();
        return result;
      }
    } catch (error) {
      console.error('Failed to create script:', error);
      throw error;
    }
  };

  const updateScript = async (id: string, data: Partial<TestScript>) => {
    try {
      const result = await window.electronAPI?.updateTestScript?.(id, data);
      if (result) fetch();
      return result;
    } catch (error) {
      console.error('Failed to update script:', error);
      throw error;
    }
  };

  const deleteScript = async (id: string) => {
    try {
      const result = await window.electronAPI?.deleteTestScript?.(id);
      if (result) fetch();
      return result;
    } catch (error) {
      console.error('Failed to delete script:', error);
      throw error;
    }
  };

  return { scripts, loading, createScript, updateScript, deleteScript, refetch: fetch };
};
