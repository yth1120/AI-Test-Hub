import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ProjectSettings, AIProvider } from '../../shared/types';
import { useProject } from './useProject';

interface SettingsContextValue {
  settings: ProjectSettings | null;
  loading: boolean;
  isAIConfigured: boolean;
  saveSettings: (newSettings: Partial<ProjectSettings>) => Promise<ProjectSettings | void>;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: null,
  loading: true,
  isAIConfigured: false,
  saveSettings: async () => {},
  reload: async () => {},
});

export const useSettingsContext = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentProject } = useProject();
  const projectId = currentProject?.id || '';
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!projectId) return;
    try {
      if (!window.electronAPI?.getProjectSettings) {
        const defaultSettings: ProjectSettings = {
          id: 'settings-1',
          projectId: projectId,
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
        return;
      }

      const saved = await window.electronAPI.getProjectSettings(projectId);
      if (saved) {
        setSettings(saved);
      }
    } catch (error) {
      console.error('Error loading global settings:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(async (newSettings: Partial<ProjectSettings>) => {
    if (!settings || !projectId) return;

    const updated = {
      ...settings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (window.electronAPI?.saveProjectSettings) {
        const saved = await window.electronAPI.saveProjectSettings(projectId, updated);
        setSettings(saved);
        return saved;
      } else {
        setSettings(updated as ProjectSettings);
        return updated as ProjectSettings;
      }
    } catch (error) {
      console.error('Error saving global settings:', error);
      throw error;
    }
  }, [settings]);

  const isAIConfigured = !!(settings?.apiKey && settings?.aiProvider);

  return (
    <SettingsContext.Provider value={{ settings, loading, isAIConfigured, saveSettings, reload: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
