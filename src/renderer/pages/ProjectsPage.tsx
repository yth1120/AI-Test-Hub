import React, { useState } from 'react';
import { Folders, Plus, PencilSimple, Trash, FolderOpen } from '@phosphor-icons/react';
import { useProject } from '../hooks/useProject';
import type { Project } from '../../shared/types';

export const ProjectsPage: React.FC = () => {
  const { projects, loading, currentProject, switchProject, createProject, updateProject, deleteProject } = useProject();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setPencilSimpleingProject] = useState<Project | null>(null);

  const handleCreate = async (data: { name: string; description: string }) => {
    await createProject(data);
    setShowCreateModal(false);
  };

  const handleUpdate = async (data: { name: string; description: string }) => {
    if (editingProject) {
      await updateProject(editingProject.id, data);
      setPencilSimpleingProject(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除该项目吗？项目下的所有需求、用例和缺陷都将被删除。')) {
      await deleteProject(id);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-slate-200/50 dark:bg-slate-950/50 p-8">
        <div className="text-center text-slate-500 dark:text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-slate-200/50 dark:bg-slate-950/50 p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">项目管理</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">创建和管理项目，切换当前工作项目。</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <Plus size={16} className="mr-2" />
            新建项目
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const isActive = currentProject?.id === project.id;
          return (
            <div
              key={project.id}
              className={`bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${
                isActive ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <Folders size={20} className={isActive ? 'text-blue-600' : 'text-slate-500'} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{project.name}</h3>
                      {isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 mt-1 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                          当前项目
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setPencilSimpleingProject(project)}
                      title="编辑"
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                    >
                      <PencilSimple size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      title="删除"
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 line-clamp-2">
                  {project.description || '暂无描述'}
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    创建于 {project.createdAt ? new Date(project.createdAt).toLocaleDateString('zh-CN') : '-'}
                  </span>
                  {!isActive && (
                    <button
                      onClick={() => switchProject(project.id)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      切换到此项目
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400 dark:text-slate-500">
            <FolderOpen size={48} className="mx-auto mb-4" />
            <p>暂无项目</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              创建第一个项目
            </button>
          </div>
        )}
      </div>

      {(showCreateModal || editingProject) && (
        <ProjectFormModal
          project={editingProject}
          onClose={() => { setShowCreateModal(false); setPencilSimpleingProject(null); }}
          onSave={editingProject ? handleUpdate : handleCreate}
        />
      )}
    </div>
  );
};

interface ProjectFormModalProps {
  project?: Project | null;
  onClose: () => void;
  onSave: (data: { name: string; description: string }) => void;
}

const ProjectFormModal: React.FC<ProjectFormModalProps> = ({ project, onClose, onSave }) => {
  const isPencilSimple = !!project;
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {isPencilSimple ? '编辑项目' : '创建新项目'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">项目名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如：核心交易系统 v2.0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">项目描述</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="简要描述项目用途..."
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
              取消
            </button>
            <button type="submit" className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90">
              {isPencilSimple ? '保存' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
