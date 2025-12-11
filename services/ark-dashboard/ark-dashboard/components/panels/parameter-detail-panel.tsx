'use client';

import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  Loader2,
  Plus,
  Settings,
  Trash,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { configMapsService } from '@/lib/services';

interface ConfigMapKeyRef {
  name: string;
  key: string;
  optional?: boolean;
}

interface SecretKeyRef {
  name: string;
  key: string;
  optional?: boolean;
}

interface ValueFrom {
  configMapKeyRef?: ConfigMapKeyRef;
  secretKeyRef?: SecretKeyRef;
}

interface Parameter {
  name: string;
  value?: string;
  valueFrom?: ValueFrom;
}

interface ParameterDetailPanelProps {
  parameters: Parameter[];
  onParametersChange: (parameters: Parameter[]) => void;
  error?: string;
}

interface ConfigMapEntry {
  input: string;
  expectedOutput: string;
}

export function ParameterDetailPanel({
  parameters,
  onParametersChange,
  error,
}: ParameterDetailPanelProps) {
  const [expandedParams, setExpandedParams] = useState<Set<number>>(new Set());
  const [viewingValueFrom, setViewingValueFrom] = useState<{
    open: boolean;
    param: Parameter | null;
  }>({ open: false, param: null });
  const [configMapData, setConfigMapData] = useState<ConfigMapEntry[] | null>(
    null,
  );
  const [loadingConfigMap, setLoadingConfigMap] = useState(false);
  const [configMapError, setConfigMapError] = useState<string | null>(null);

  const handleViewValueFrom = async (param: Parameter) => {
    setViewingValueFrom({ open: true, param });
    setConfigMapData(null);
    setConfigMapError(null);

    if (param.valueFrom?.configMapKeyRef) {
      setLoadingConfigMap(true);
      try {
        const data = await configMapsService.get(
          param.valueFrom.configMapKeyRef.name,
        );
        const key = param.valueFrom.configMapKeyRef.key;
        const rawData = data.data[key];

        if (rawData) {
          try {
            const parsed = JSON.parse(rawData);
            setConfigMapData(Array.isArray(parsed) ? parsed : [parsed]);
          } catch {
            setConfigMapError('Failed to parse ConfigMap data as JSON');
          }
        } else {
          setConfigMapError(`Key "${key}" not found in ConfigMap`);
        }
      } catch (err) {
        setConfigMapError(
          err instanceof Error ? err.message : 'Failed to fetch ConfigMap',
        );
      } finally {
        setLoadingConfigMap(false);
      }
    }
  };

  const addParameter = () => {
    const newParams = [...parameters, { name: '', value: '' }];
    onParametersChange(newParams);
    // Auto-expand the new parameter
    setExpandedParams(prev => new Set(prev).add(newParams.length - 1));
  };

  const removeParameter = (index: number) => {
    const newParams = parameters.filter((_, i) => i !== index);
    onParametersChange(newParams);
    // Remove from expanded set and adjust indices
    const newExpanded = new Set<number>();
    expandedParams.forEach(expandedIndex => {
      if (expandedIndex < index) {
        newExpanded.add(expandedIndex);
      } else if (expandedIndex > index) {
        newExpanded.add(expandedIndex - 1);
      }
    });
    setExpandedParams(newExpanded);
  };

  const updateParameter = (
    index: number,
    field: 'name' | 'value',
    value: string,
  ) => {
    const newParams = [...parameters];
    newParams[index][field] = value;
    onParametersChange(newParams);
  };

  const toggleParameterExpanded = (index: number) => {
    const newExpanded = new Set(expandedParams);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedParams(newExpanded);
  };

  const isLongValue = (value: string | undefined) =>
    value ? value.length > 100 || value.includes('\n') : false;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <h3 className="font-medium">Parameters</h3>
            {parameters.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {parameters.length}
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addParameter}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {error && (
          <div className="text-destructive flex items-center gap-1 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      <div
        className={`flex flex-1 flex-col items-center space-y-3 overflow-y-auto p-4 ${
          parameters.length === 0 ? 'justify-center' : ''
        }`}>
        {parameters.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            <Settings className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No parameters configured</p>
            <p className="text-xs">Click the + button to add parameters</p>
          </div>
        ) : (
          parameters.map((param, index) => {
            const isExpanded = expandedParams.has(index);
            const hasLongValue = isLongValue(param.value);

            return (
              <Card key={index} className="relative min-h-[auto] w-full py-5">
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => toggleParameterExpanded(index)}>
                  <CardHeader>
                    <div className="flex w-full justify-between">
                      <CollapsibleTrigger
                        asChild
                        className="flex items-center justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-color-none p-0">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="text-sm font-medium">
                              {param.name || `Parameter ${index + 1}`}
                            </span>
                            {hasLongValue && (
                              <Badge variant="outline" className="text-xs">
                                Long text
                              </Badge>
                            )}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParameter(index)}
                        className="hover:text-destructive p-0 text-red-500">
                        <Trash />
                      </Button>
                    </div>
                    {!isExpanded && (param.value || param.valueFrom) && (
                      <div
                        className="text-muted-foreground mt-1 overflow-hidden text-xs break-words"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '1.4',
                          maxHeight: '2.8em',
                        }}>
                        {param.value ? (
                          <>
                            Value:{' '}
                            {param.value.length > 120
                              ? `${param.value.substring(0, 120)}...`
                              : param.value}
                          </>
                        ) : param.valueFrom?.configMapKeyRef ? (
                          <>
                            From ConfigMap:{' '}
                            {param.valueFrom.configMapKeyRef.name}/
                            {param.valueFrom.configMapKeyRef.key}
                          </>
                        ) : param.valueFrom?.secretKeyRef ? (
                          <>
                            From Secret: {param.valueFrom.secretKeyRef.name}/
                            {param.valueFrom.secretKeyRef.key}
                          </>
                        ) : null}
                      </div>
                    )}
                  </CardHeader>

                  <CollapsibleContent className="pt-5">
                    <CardContent className="space-y-3 pt-0">
                      <div className="flex flex-col gap-1 space-y-1">
                        <Label className="text-xs font-medium">Name</Label>
                        <Input
                          value={param.name}
                          onChange={e =>
                            updateParameter(index, 'name', e.target.value)
                          }
                          placeholder="parameter_name"
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-1 space-y-1">
                        <Label className="text-xs font-medium">Value</Label>
                        {param.valueFrom ? (
                          <div className="bg-muted flex items-start justify-between gap-2 rounded p-3 text-xs">
                            <div className="flex-1">
                              <div className="mb-1 font-medium">
                                Value Reference:
                              </div>
                              {param.valueFrom.configMapKeyRef && (
                                <div className="text-muted-foreground">
                                  ConfigMap:{' '}
                                  {param.valueFrom.configMapKeyRef.name}
                                  <br />
                                  Key: {param.valueFrom.configMapKeyRef.key}
                                </div>
                              )}
                              {param.valueFrom.secretKeyRef && (
                                <div className="text-muted-foreground">
                                  Secret: {param.valueFrom.secretKeyRef.name}
                                  <br />
                                  Key: {param.valueFrom.secretKeyRef.key}
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleViewValueFrom(param)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : hasLongValue ||
                          (param.value && param.value.length > 50) ? (
                          <Textarea
                            value={param.value || ''}
                            onChange={e =>
                              updateParameter(index, 'value', e.target.value)
                            }
                            placeholder="Parameter value..."
                            className="min-h-[100px] resize-none text-sm whitespace-pre-wrap"
                            rows={6}
                            style={{
                              whiteSpace: 'pre-wrap',
                              wordWrap: 'break-word',
                            }}
                          />
                        ) : (
                          <Input
                            value={param.value || ''}
                            onChange={e =>
                              updateParameter(index, 'value', e.target.value)
                            }
                            placeholder="Parameter value"
                            className="h-8 text-sm"
                          />
                        )}
                      </div>

                      {param.name === 'evaluator_role' && param.value && (
                        <div className="bg-muted/50 rounded p-3 text-xs">
                          <div className="mb-2 font-medium">
                            Evaluator Role Preview:
                          </div>
                          <div className="text-muted-foreground leading-relaxed break-words whitespace-pre-wrap">
                            {param.value.substring(0, 300)}
                            {param.value.length > 300 && '...'}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })
        )}
      </div>

      {parameters.length > 0 && (
        <div className="bg-muted/30 border-t p-4">
          <div className="text-muted-foreground text-xs">
            {parameters.length} parameter{parameters.length !== 1 ? 's' : ''}{' '}
            configured
          </div>
        </div>
      )}

      <Dialog
        open={viewingValueFrom.open}
        onOpenChange={open =>
          setViewingValueFrom({ open, param: viewingValueFrom.param })
        }>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Parameter Value Reference</DialogTitle>
          </DialogHeader>

          {viewingValueFrom.param?.valueFrom?.configMapKeyRef && (
            <div className="space-y-4">
              {loadingConfigMap && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-muted-foreground ml-2 text-sm">
                    Loading ConfigMap data...
                  </span>
                </div>
              )}

              {configMapError && (
                <div className="bg-destructive/10 text-destructive rounded-lg border border-red-200 p-4 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Error loading data</span>
                  </div>
                  <p className="mt-1 text-xs">{configMapError}</p>
                </div>
              )}

              {configMapData && (
                <div className="space-y-2">
                  <div className="max-h-[400px] overflow-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          <th className="border-r px-4 py-2 text-left font-medium">
                            Input
                          </th>
                          <th className="px-4 py-2 text-left font-medium">
                            Expected Output
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {configMapData.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-muted/50 border-t">
                            <td className="border-r px-4 py-2">
                              {entry.input}
                            </td>
                            <td className="px-4 py-2">
                              {entry.expectedOutput}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Showing {configMapData.length} entr
                    {configMapData.length === 1 ? 'y' : 'ies'}
                  </p>
                </div>
              )}
            </div>
          )}

          {viewingValueFrom.param?.valueFrom?.secretKeyRef && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-purple-50 p-4 dark:bg-purple-950/20">
                <div className="mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                    Secret Reference
                  </h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="w-32 font-medium text-purple-800 dark:text-purple-200">
                      Resource Type:
                    </span>
                    <span className="text-purple-700 dark:text-purple-300">
                      Secret (Sensitive)
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-medium text-purple-800 dark:text-purple-200">
                      Name:
                    </span>
                    <span className="font-mono text-purple-700 dark:text-purple-300">
                      {viewingValueFrom.param.valueFrom.secretKeyRef.name}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-32 font-medium text-purple-800 dark:text-purple-200">
                      Key:
                    </span>
                    <span className="font-mono text-purple-700 dark:text-purple-300">
                      {viewingValueFrom.param.valueFrom.secretKeyRef.key}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="text-muted-foreground mb-2 font-medium">
                  How to view the actual data:
                </p>
                <div className="bg-background rounded border p-3 font-mono text-xs">
                  kubectl get secret{' '}
                  {viewingValueFrom.param.valueFrom.secretKeyRef.name} -o yaml
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  Note: Secret values are base64 encoded. Use{' '}
                  <code className="rounded bg-purple-100 px-1 dark:bg-purple-900/30">
                    -o jsonpath
                  </code>{' '}
                  or decode manually for readability.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
