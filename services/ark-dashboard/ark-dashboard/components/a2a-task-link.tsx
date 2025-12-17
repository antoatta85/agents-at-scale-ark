'use client';

import { ChevronDown, ChevronUp, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { useMarkdownProcessor } from '@/lib/hooks/use-markdown-processor';
import { useA2ATask } from '@/lib/services/a2a-tasks-hooks';

interface A2ATaskLinkProps {
  taskId: string;
  artifactCount?: number;
  renderMode?: 'text' | 'markdown';
}

export function A2ATaskLink({ taskId, renderMode = 'text' }: A2ATaskLinkProps) {
  const { data: task, isLoading, error } = useA2ATask(`a2a-task-${taskId}`);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const textParts =
    task.status?.artifacts?.flatMap(artifact =>
      artifact.parts.filter(part => part.kind === 'text'),
    ) ?? [];

  const hasTextParts = textParts.length > 0;

  return (
    <div className="inline-flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="inline-flex items-center gap-2">
        <Link
          href={`/tasks/a2a-task-${taskId}`}
          className="text-primary hover:text-primary/80 inline-flex items-center gap-2 text-sm transition-colors">
          <FileText className="h-4 w-4" />
          <span>
            View task details
            {displayArtifactCount > 0 && ` (${displayArtifactCount} artifacts)`}
          </span>
        </Link>
        {hasTextParts && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}>
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span>Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span>Expand</span>
              </>
            )}
          </button>
        )}
      </div>
      {isExpanded && hasTextParts && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800">
          {textParts.map((part, index) => (
            <TextPartRenderer
              key={index}
              text={part.text ?? ''}
              renderMode={renderMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TextPartRenderer({
  text,
  renderMode,
}: {
  text: string;
  renderMode: 'text' | 'markdown';
}) {
  const markdownContent = useMarkdownProcessor(text);

  if (renderMode === 'markdown') {
    return <div>{markdownContent}</div>;
  }

  return <div className="whitespace-pre-wrap">{text}</div>;
}
