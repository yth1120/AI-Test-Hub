'use client';

import { useProject } from '@/renderer/hooks/useProject';
import { AgentWorkflowPage } from '@/renderer/pages/AgentWorkflowPage';

export default function AgentPage() {
  const { currentProject } = useProject();
  return <AgentWorkflowPage currentProject={currentProject} />;
}
