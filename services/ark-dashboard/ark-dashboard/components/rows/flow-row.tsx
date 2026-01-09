'use client';

import { Sparkle, Workflow } from 'lucide-react';
import Link from 'next/link';

export interface Flow {
  id: string;
  title?: string;
  description?: string;
  stages: number;
  manifest?: string;
}

interface FlowRowProps {
  readonly flow: Flow;
}

export function FlowRow({ flow }: FlowRowProps) {
  const isComposerFlow = !!(flow.title && flow.description);

  return (
    <Link href={`/workflow-templates/${flow.id}`} className="block w-full">
      <div className="bg-card hover:bg-accent/5 flex w-full items-center gap-4 rounded-md border px-4 py-3 transition-colors cursor-pointer hover:border-primary/50 overflow-hidden">
        <div className="flex flex-1 items-center gap-3 min-w-0 overflow-hidden">
          <div className="relative flex-shrink-0">
            <Workflow className="text-muted-foreground h-5 w-5 flex-shrink-0" />
            {isComposerFlow && (
              <Sparkle className="absolute -top-1 -right-1 h-2.5 w-2.5 fill-primary text-primary opacity-60" />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
            <p className="truncate text-sm font-medium font-mono" title={flow.id}>
              {flow.id}
            </p>
            {flow.title && (
              <p className="text-muted-foreground truncate text-xs font-medium" title={flow.title}>
                {flow.title}
              </p>
            )}
            {flow.description && (
              <p
                className="text-muted-foreground truncate text-xs"
                title={flow.description}>
                {flow.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <span className="font-medium">{flow.stages}</span>
            <span>{flow.stages === 1 ? 'stage' : 'stages'}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
