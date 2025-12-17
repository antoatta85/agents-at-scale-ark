'use client';

import { Workflow } from 'lucide-react';
import Link from 'next/link';

export interface Flow {
  id: string;
  title: string;
  description: string;
  stages: number;
}

interface FlowRowProps {
  readonly flow: Flow;
}

export function FlowRow({ flow }: FlowRowProps) {
  return (
    <Link href={`/flows/${flow.id}`}>
      <div className="bg-card hover:bg-accent/5 flex w-full flex-wrap items-center gap-4 rounded-md border px-4 py-3 transition-colors cursor-pointer hover:border-primary/50">
        <div className="flex flex-grow items-center gap-3 overflow-hidden">
          <Workflow className="text-muted-foreground h-5 w-5 flex-shrink-0" />

          <div className="flex max-w-[400px] min-w-0 flex-col gap-1">
            <p className="truncate text-sm font-medium" title={flow.title}>
              {flow.title}
            </p>
            <p
              className="text-muted-foreground truncate text-xs"
              title={flow.description}>
              {flow.description}
            </p>
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
