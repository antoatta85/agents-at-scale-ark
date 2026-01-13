'use client';

import { Bot, Plus, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { QueryParameter } from '@/lib/utils/query-parameters';

import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

export interface AgentPromptParameterEditorProps {
  parameters: QueryParameter[];
  onChange: (parameters: QueryParameter[]) => void;
  agentRequiredParams: string[];
  disabled?: boolean;
  className?: string;
}

export function AgentPromptParameterEditor({
  parameters,
  onChange,
  agentRequiredParams,
  disabled,
  className,
}: AgentPromptParameterEditorProps) {
  const definedParamNames = new Set(
    parameters.map(p => p.name).filter(Boolean)
  );

  const undefinedAgentParams = agentRequiredParams.filter(
    p => !definedParamNames.has(p)
  );

  const addParameter = (name: string) => {
    onChange([...parameters, { name, value: '', source: 'agent', required: true }]);
  };

  const removeParameter = (index: number) => {
    onChange(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (
    index: number,
    updates: Partial<QueryParameter>
  ) => {
    const newParams = [...parameters];
    newParams[index] = { ...newParams[index], ...updates };
    onChange(newParams);
  };

  const agentParams = parameters.filter(
    p => p.source === 'agent' || agentRequiredParams.includes(p.name)
  );

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Agent Prompt Parameters
        </h3>
      </div>

      {undefinedAgentParams.length > 0 && (
        <div className="rounded-md border border-blue-500/30 bg-blue-500/10 p-3">
          <div className="flex items-start gap-2">
            <Bot className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                The selected agent expects these query parameters:
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {undefinedAgentParams.map(param => (
                  <button
                    key={param}
                    type="button"
                    onClick={() => addParameter(param)}
                    disabled={disabled}
                    className="inline-flex items-center rounded bg-blue-500/20 px-2 py-0.5 font-mono text-xs text-blue-700 transition-colors hover:bg-blue-500/30 disabled:cursor-not-allowed dark:text-blue-400">
                    {param}
                    <Plus className="ml-1 h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {agentParams.length === 0 && undefinedAgentParams.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-center">
          <p className="text-xs text-muted-foreground">
            The selected agent does not require any query parameters.
          </p>
        </div>
      ) : agentParams.length > 0 ? (
        <div className="space-y-2">
          {agentParams.map((param, index) => {
            const actualIndex = parameters.findIndex(p => p === param);
            const isDuplicate =
              param.name &&
              parameters.filter(p => p.name === param.name).length > 1;

            return (
              <div
                key={index}
                className={cn(
                  'rounded-md border p-3',
                  isDuplicate && 'border-destructive/50 bg-destructive/5'
                )}>
                <div className="flex items-start gap-2">
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Parameter Name
                        </Label>
                        <Input
                          value={param.name}
                          disabled
                          className={cn(
                            'h-8 font-mono text-sm bg-muted/50',
                            isDuplicate && 'border-destructive'
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Value
                        </Label>
                        <Input
                          value={param.value}
                          onChange={e =>
                            updateParameter(actualIndex, { value: e.target.value })
                          }
                          placeholder="Enter value..."
                          disabled={disabled}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParameter(actualIndex)}
                      disabled={disabled}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {agentRequiredParams.length > 0 && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>{agentParams.length} defined</span>
          <span>·</span>
          <span className="text-blue-600 dark:text-blue-400">
            {agentRequiredParams.length} required by agent
          </span>
        </div>
      )}
    </div>
  );
}

