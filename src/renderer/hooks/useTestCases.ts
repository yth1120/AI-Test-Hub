import { useState, useEffect, useCallback } from 'react';
import type { TestCase } from '../../shared/types';
import { useProject } from './useProject';

export const useTestCases = (projectId?: string) => {
  const { currentProject } = useProject();
  const effectiveProjectId = projectId || currentProject?.id || '';
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!effectiveProjectId) return;
    try {
      if (window.electronAPI?.getTestCases) {
        const data = await window.electronAPI.getTestCases(effectiveProjectId);
        if (Array.isArray(data)) {
          setTestCases(data.map(tc => ({
            ...tc,
            steps: typeof tc.steps === 'string' ? JSON.parse(tc.steps) : tc.steps,
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch test cases:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createTestCase = async (data: Partial<TestCase>) => {
    if (!effectiveProjectId) return;
    try {
      const result = await window.electronAPI?.createTestCase?.({ ...data, projectId: effectiveProjectId });
      if (result) {
        fetch();
        return result;
      }
    } catch (error) {
      console.error('Failed to create test case:', error);
      throw error;
    }
  };

  const updateTestCase = async (id: string, data: Partial<TestCase>) => {
    try {
      const result = await window.electronAPI?.updateTestCase?.(id, data);
      if (result) fetch();
      return result;
    } catch (error) {
      console.error('Failed to update test case:', error);
      throw error;
    }
  };

  const deleteTestCase = async (id: string) => {
    try {
      const result = await window.electronAPI?.deleteTestCase?.(id);
      if (result) fetch();
      return result;
    } catch (error) {
      console.error('Failed to delete test case:', error);
      throw error;
    }
  };

  return { testCases, loading, createTestCase, updateTestCase, deleteTestCase, refetch: fetch };
};
