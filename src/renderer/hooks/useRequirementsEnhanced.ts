import { useState, useEffect, useCallback } from 'react';
import type { Requirement, Priority, RequirementStatus, AIProvider, GenerationType } from '../../shared/types';
import { useProject } from './useProject';

export const useRequirementsEnhanced = (projectId?: string) => {
  const { currentProject } = useProject();
  const effectiveProjectId = projectId || currentProject?.id || '';
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const fetchRequirements = useCallback(async () => {
    if (!effectiveProjectId) return;
    setLoading(true);
    try {
      if (window.electronAPI?.getRequirements) {
        const result = await window.electronAPI.getRequirements(effectiveProjectId);
        if (Array.isArray(result)) {
          setRequirements(result.map(r => ({
            ...r,
            date: r.date ?? r.updatedAt?.split('T')[0],
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch requirements:', error);
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  const createRequirement = async (data: Partial<Requirement>) => {
    if (!effectiveProjectId) return;
    try {
      if (window.electronAPI?.createRequirement) {
        const result = await window.electronAPI.createRequirement({
          ...data,
          projectId: effectiveProjectId,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        if (result) {
          fetchRequirements();
          return result;
        }
      }
      const newRequirement: Requirement = {
        id: `REQ-${Date.now()}`,
        title: data.title!,
        description: data.description,
        priority: data.priority || 'MEDIUM' as Priority,
        status: data.status || 'DRAFT' as RequirementStatus,
        projectId: effectiveProjectId,
        author: data.author || 'Unknown',
        testCoverage: 0,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setRequirements(prev => [newRequirement, ...prev]);
      return newRequirement;
    } catch (error) {
      console.error('Failed to create requirement:', error);
      throw error;
    }
  };

  const updateRequirement = async (id: string, data: Partial<Requirement>) => {
    try {
      if (window.electronAPI?.updateRequirement) {
        const result = await window.electronAPI.updateRequirement(id, {
          ...data,
          updatedAt: new Date().toISOString(),
        });
        if (result) {
          fetchRequirements();
          return result;
        }
      }
      setRequirements(prev => prev.map(req =>
        req.id === id ? { ...req, ...data, updatedAt: new Date().toISOString() } : req
      ));
    } catch (error) {
      console.error('Failed to update requirement:', error);
      throw error;
    }
  };

  const deleteRequirement = async (id: string) => {
    try {
      if (window.electronAPI?.deleteRequirement) {
        const result = await window.electronAPI.deleteRequirement(id);
        if (result?.success) {
          fetchRequirements();
          return result;
        }
      }
      setRequirements(prev => prev.filter(req => req.id !== id));
      return { success: true };
    } catch (error) {
      console.error('Failed to delete requirement:', error);
      throw error;
    }
  };

  const generateAIContent = async (requirementId: string, type: string, customPrompt?: string) => {
    const requirement = requirements.find(r => r.id === requirementId);
    if (!requirement) {
      throw new Error('Requirement not found');
    }

    let aiProvider: string = 'OPENAI';
    try {
      if (window.electronAPI?.getProjectSettings) {
        const settings = await window.electronAPI.getProjectSettings(projectId);
        if (settings?.aiProvider) {
          aiProvider = settings.aiProvider;
        }
      }
    } catch (error) {
      console.error('Failed to get project settings:', error);
    }

    const params = {
      requirement,
      type: type as GenerationType,
      projectId: effectiveProjectId,
      aiProvider: aiProvider as AIProvider,
      prompt: customPrompt,
    };

    setIsGeneratingAI(true);
    try {
      const result = await window.electronAPI?.generateContent?.(params);
      return result;
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const filteredRequirements = searchQuery
    ? requirements.filter(req =>
        req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : requirements;

  return {
    requirements: filteredRequirements,
    loading,
    searchQuery,
    setSearchQuery,
    createRequirement,
    updateRequirement,
    deleteRequirement,
    generateAIContent,
    isGeneratingAI,
    refetch: fetchRequirements,
  };
};
