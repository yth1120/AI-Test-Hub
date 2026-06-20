import { useState, useEffect } from 'react';
import type { ProjectSettings, AIProvider } from '../../shared/types';
import { useProject } from './useProject';

export const useProjectSettings = () => {
  const { currentProject } = useProject();
  const currentProjectId = currentProject?.id || '';
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [currentProjectId]);

  const loadSettings = async () => {
    try {
      // Check if electronAPI is available (Electron environment)
      if (!window.electronAPI?.getProjectSettings) {
        console.warn('electronAPI not available, using default settings');
        throw new Error('electronAPI not available');
      }

      // Load settings from database via IPC
      const savedSettings = await window.electronAPI.getProjectSettings(currentProjectId);

      if (savedSettings) {
        setSettings(savedSettings);
      } else {
        // Create default settings if none exist
        const defaultSettings: ProjectSettings = {
          id: 'settings-1',
          projectId: currentProjectId,
          aiProvider: 'OPENAI' as AIProvider,
          apiKey: '', // Will be loaded from keychain separately
          baseUrl: 'https://api.openai.com',
          maxTokens: 2000,
          temperature: 0.7,
          model: '',
          enableStreaming: true,
          systemPromptTestPlan: '',
          systemPromptTestCase: '',
          systemPromptScript: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);

      // Fallback to default settings
      const defaultSettings: ProjectSettings = {
        id: 'settings-1',
        projectId: currentProjectId,
        aiProvider: 'OPENAI' as AIProvider,
        apiKey: '',
        baseUrl: 'https://api.openai.com',
        maxTokens: 2000,
        temperature: 0.7,
        model: '',
        enableStreaming: true,
        systemPromptTestPlan: '',
        systemPromptTestCase: '',
        systemPromptScript: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<ProjectSettings>) => {
    if (!settings) return;

    const updatedSettings = {
      ...settings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };

    try {
      // Check if electronAPI is available
      if (!window.electronAPI?.saveProjectSettings) {
        console.warn('electronAPI not available, settings will not be persisted');
        setSettings(updatedSettings as ProjectSettings);
        return updatedSettings;
      }

      // Save settings via IPC (API key will be saved to keychain)
      const saved = await window.electronAPI.saveProjectSettings(currentProjectId, updatedSettings);
      setSettings(saved);
      return saved;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  const loadApiKey = async (projectId: string, aiProvider: AIProvider): Promise<string> => {
    try {
      // Check if electronAPI is available
      if (!window.electronAPI?.loadApiKey) {
        console.warn('electronAPI not available, cannot load API key');
        return '';
      }

      // Load API key from keychain via IPC
      const apiKey = await window.electronAPI.loadApiKey(projectId, aiProvider);
      return apiKey || '';
    } catch (error) {
      console.error('Error loading API key:', error);
      return '';
    }
  };

  const testConnection = async (apiKey: string, aiProvider: AIProvider): Promise<boolean> => {
    try {
      // Check if electronAPI is available
      if (!window.electronAPI?.generateContent) {
        console.warn('electronAPI not available, cannot test connection');
        // Simulate success in development
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
      }

      // Simple test by trying to generate a small piece of content
      const testParams = {
        requirement: {
          id: 'test-req',
          title: '测试连接',
          status: 'DRAFT' as const,
          priority: 'MEDIUM' as const,
          projectId: currentProjectId,
          author: '系统',
          testCoverage: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        type: 'TEST_PLAN' as const,
        projectId: currentProjectId,
        aiProvider,
      };

      // This will trigger the AI service which will validate the API key
      const result = await window.electronAPI.generateContent(testParams);
      return !!result;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

  return {
    settings,
    loading,
    saveSettings,
    loadApiKey,
    testConnection,
  };
};