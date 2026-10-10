import React from 'react';
import { TaskPriority, TaskStatus, AircraftStatus } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'purple'
    | 'indigo'
    | 'neutral'
    | 'blue'
    | 'green'
    | 'red';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-200 border-slate-700',
    success: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
    green: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
    warning: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
    danger: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
    red: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
    info: 'bg-sky-950/70 text-sky-300 border-sky-800/60',
    blue: 'bg-sky-950/70 text-sky-300 border-sky-800/60',
    purple: 'bg-purple-950/70 text-purple-300 border-purple-800/60',
    indigo: 'bg-indigo-950/70 text-indigo-300 border-indigo-800/60',
    neutral: 'bg-slate-900 text-slate-400 border-slate-800',
  };

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 font-medium',
    sm: 'text-xs px-2.5 py-0.5 font-medium',
    md: 'text-sm px-3 py-1 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-xs ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export const TaskStatusBadge: React.FC<{ status: TaskStatus; size?: 'xs' | 'sm' | 'md' }> = ({
  status,
  size = 'xs',
}) => {
  switch (status) {
    case 'COMPLETED':
      return <Badge variant="success" size={size}>Completed</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="info" size={size}>In Progress</Badge>;
    case 'READY':
      return <Badge variant="warning" size={size}>Ready to Start</Badge>;
    case 'WAITING':
    case 'WAITING_FOR_DEPENDENCY':
      return <Badge variant="neutral" size={size}>Waiting on Dependency</Badge>;
    case 'BLOCKED':
      return <Badge variant="danger" size={size}>Blocked</Badge>;
    case 'CANCELLED':
      return <Badge variant="neutral" size={size}>Cancelled</Badge>;
    case 'NOT_STARTED':
    default:
      return <Badge variant="default" size={size}>Not Started</Badge>;
  }
};

export const TaskPriorityBadge: React.FC<{ priority: TaskPriority; size?: 'xs' | 'sm' | 'md' }> = ({
  priority,
  size = 'xs',
}) => {
  switch (priority) {
    case 'URGENT':
      return <Badge variant="danger" size={size}>Urgent</Badge>;
    case 'HIGH':
      return <Badge variant="warning" size={size}>High</Badge>;
    case 'MEDIUM':
      return <Badge variant="info" size={size}>Medium</Badge>;
    case 'LOW':
    default:
      return <Badge variant="default" size={size}>Low</Badge>;
  }
};

export const AircraftStatusBadge: React.FC<{ status: AircraftStatus; size?: 'xs' | 'sm' | 'md' }> = ({
  status,
  size = 'xs',
}) => {
  switch (status) {
    case 'COMPLETED':
      return <Badge variant="success" size={size}>Completed</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="info" size={size}>In Progress</Badge>;
    case 'TEARDOWN':
      return <Badge variant="warning" size={size}>In Teardown</Badge>;
    case 'ARCHIVED':
      return <Badge variant="neutral" size={size}>Archived</Badge>;
    case 'ACTIVE':
    default:
      return <Badge variant="purple" size={size}>Active</Badge>;
  }
};

