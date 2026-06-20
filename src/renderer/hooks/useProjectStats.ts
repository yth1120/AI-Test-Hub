import { useState, useEffect } from 'react';
import type { ProjectStats } from '../../shared/types';
import { useProject } from './useProject';

export const useProjectStats = (projectId?: string) => {
  const { currentProject } = useProject();
  const effectiveProjectId = projectId || currentProject?.id || '';
  const [stats, setStats] = useState<ProjectStats>({
    totalRequirements: 0,
    pendingReview: 0,
    lowCoverage: 0,
    midCoverage: 0,
    highCoverage: 0,
    averageCoverage: 0,
    totalTestCases: 0,
    passRate: 0,
    automationRate: 0,
    pendingExecution: 0,
    totalDefects: 0,
    openDefects: 0,
    totalScripts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!effectiveProjectId) {
        setLoading(false);
        return;
      }
      try {
        if (window.electronAPI?.getDashboardStats) {
          const data = await window.electronAPI.getDashboardStats(effectiveProjectId);
          if (data) setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [effectiveProjectId]);

  return { stats, loading };
};
