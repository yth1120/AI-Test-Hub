import React from 'react';
import { CheckCircle, Clock, WarningCircle, SealCheck } from '@phosphor-icons/react';
import type { Priority, RequirementStatus } from '../../shared/types';

interface PriorityBadgeProps {
  priority: Priority;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const styles = {
    CRITICAL: 'priority-badge-critical border-red-200',
    HIGH: 'priority-badge-high border-orange-200',
    MEDIUM: 'priority-badge-medium border-blue-200',
    LOW: 'priority-badge-low border-slate-200',
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[priority]}`}>
      {priority}
    </span>
  );
};

interface StatusBadgeProps {
  status: RequirementStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = {
    APPROVED: {
      color: 'status-badge-approved',
      icon: <CheckCircle size={14} className="mr-1" />,
      label: '已评审'
    },
    IN_PROGRESS: {
      color: 'status-badge-in-progress',
      icon: <Clock size={14} className="mr-1" />,
      label: '开发/测试中'
    },
    REVIEW: {
      color: 'status-badge-review',
      icon: <WarningCircle size={14} className="mr-1" />,
      label: '待评审'
    },
    DRAFT: {
      color: 'status-badge-draft',
      icon: <SealCheck size={14} className="mr-1" />,
      label: '草稿'
    },
  };

  const current = config[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md ${current.color}`}>
      {current.icon}
      {current.label}
    </span>
  );
};

interface CoverageBarProps {
  coverage: number;
}

export const CoverageBar: React.FC<CoverageBarProps> = ({ coverage }) => {
  let colorClass = 'bg-emerald-500';
  if (coverage < 50) colorClass = 'bg-red-500';
  else if (coverage < 80) colorClass = 'bg-amber-500';

  return (
    <div className="coverage-bar">
      <div className="coverage-bar-progress">
        <div
          className={`h-2 rounded-full ${colorClass}`}
          style={{ width: `${Math.min(coverage, 100)}%` }}
        ></div>
      </div>
      <span className="text-xs text-slate-500 w-8">{coverage}%</span>
    </div>
  );
};