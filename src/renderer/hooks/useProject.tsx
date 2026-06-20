import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Project } from '../../shared/types';

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  loading: boolean;
  switchProject: (projectId: string) => void;
  createProject: (data: { name: string; description?: string }) => Promise<Project>;
  updateProject: (id: string, data: { name?: string; description?: string }) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      if (window.electronAPI?.getProjects) {
        const data = await window.electronAPI.getProjects();
        console.log('[ProjectProvider] Fetched projects:', data);
        if (data && data.length > 0) {
          setProjects(data);
          setCurrentProject(prev => {
            if (prev) {
              const stillExists = data.find((p: Project) => p.id === prev.id);
              return stillExists || data[0];
            }
            return data[0];
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const switchProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      console.log('[ProjectProvider] Switching to project:', project.name);
      setCurrentProject(project);
    }
  }, [projects]);

  const createProject = useCallback(async (data: { name: string; description?: string }) => {
    console.log('[ProjectProvider] Creating project:', data);
    const newProject = await window.electronAPI.createProject(data);
    console.log('[ProjectProvider] Created project:', newProject);
    setProjects(prev => [newProject, ...prev]);
    setCurrentProject(newProject);
    console.log('[ProjectProvider] Set currentProject to:', newProject.name);
    return newProject;
  }, []);

  const updateProject = useCallback(async (id: string, data: { name?: string; description?: string }) => {
    const updated = await window.electronAPI.updateProject(id, data);
    setProjects(prev => prev.map(p => p.id === id ? updated : p));
    if (currentProject?.id === id) {
      setCurrentProject(updated);
    }
    return updated;
  }, [currentProject]);

  const deleteProject = useCallback(async (id: string) => {
    await window.electronAPI.deleteProject(id);
    setProjects(prev => {
      const remaining = prev.filter(p => p.id !== id);
      if (currentProject?.id === id) {
        setCurrentProject(remaining.length > 0 ? remaining[0] : null);
      }
      return remaining;
    });
  }, [currentProject]);

  return (
    <ProjectContext.Provider value={{
      currentProject,
      projects,
      loading,
      switchProject,
      createProject,
      updateProject,
      deleteProject,
      refreshProjects: fetchProjects,
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
