import { useState, useEffect, useCallback } from 'react';
import type { Defect } from '../../shared/types';
import { useProject } from './useProject';

export const useDefects = (projectId?: string) => {
  const { currentProject } = useProject();
  const effectiveProjectId = projectId || currentProject?.id || '';
  const [defects, setDefects] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!effectiveProjectId) return;
    try {
      if (window.electronAPI?.getDefects) {
        const data = await window.electronAPI.getDefects(effectiveProjectId);
        if (Array.isArray(data)) setDefects(data);
      }
    } catch (error) {
      console.error('Failed to fetch defects:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createDefect = async (data: Partial<Defect>) => {
    if (!effectiveProjectId) return;
    try {
      const result = await window.electronAPI?.createDefect?.({ ...data, projectId: effectiveProjectId });
      if (result) {
        fetch();
        return result;
      }
    } catch (error) {
      console.error('Failed to create defect:', error);
      throw error;
    }
  };

  const updateDefect = async (id: string, data: Partial<Defect>) => {
    try {
      const result = await window.electronAPI?.updateDefect?.(id, data);
      if (result) fetch();
      return result;
    } catch (error) {
      console.error('Failed to update defect:', error);
      throw error;
    }
  };

  const deleteDefect = async (id: string) => {
    try {
      const result = await window.electronAPI?.deleteDefect?.(id);
      if (result) fetch();
      return result;
    } catch (error) {
      console.error('Failed to delete defect:', error);
      throw error;
    }
  };

  return { defects, loading, createDefect, updateDefect, deleteDefect, refetch: fetch };
};
