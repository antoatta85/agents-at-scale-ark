'use client';

import { FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';

import { useA2ATask } from '@/lib/services/a2a-tasks-hooks';

interface A2ATaskLinkProps {
  taskId: string;
  artifactCount?: number;
}

export function A2ATaskLink({ taskId }: A2ATaskLinkProps) {
  const { data: task, isLoading, error } = useA2ATask(`a2a-task-${taskId}`);

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-900">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading task...</span>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-600 dark:border-red-900 dark:bg-red-950">
        <FileText className="h-4 w-4" />
        <span>Task not found ({taskId})</span>
      </div>
    );
  }

  const displayArtifactCount = task.status?.artifacts?.length ?? 0;

  return (
    <Link
      href={`/tasks/a2a-task-${taskId}`}
      className="text-primary hover:text-primary/80 inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <FileText className="h-4 w-4" />
      <span>
        View task details
        {displayArtifactCount > 0 && ` (${displayArtifactCount} artifacts)`}
      </span>
    </Link>
  );
}
