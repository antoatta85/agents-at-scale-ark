'use client';

import {
  ArrowUpRightIcon,
  ChevronDown,
  ChevronUp,
  Edit,
  Plus,
  RefreshCw,
  StopCircle,
  Trash2,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { toast } from 'sonner';

import { EvaluationEditor } from '@/components/editors';
import {
  EvaluationFilter,
  type EvaluationFilters,
} from '@/components/filtering';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { components } from '@/lib/api/generated/types';
import { DASHBOARD_SECTIONS } from '@/lib/constants';
import type {
  EvaluationDetailResponse,
  EvaluationResponse,
} from '@/lib/services';
import { evaluationsService } from '@/lib/services/evaluations';
import { useGetAllEvaluationsWithDetails } from '@/lib/services/evaluations-hooks';
import { formatAge } from '@/lib/utils/time';

import { createQueryString } from '../../lib/utils/query-string';
import { Checkbox } from '../ui/checkbox';
import { Pagination } from '../ui/pagination';

type EvaluationCreateRequest = components['schemas']['EvaluationCreateRequest'];
type EvaluationUpdateRequest = components['schemas']['EvaluationUpdateRequest'];

type SortField = 'name' | 'score' | 'status' | 'age';
type SortDirection = 'asc' | 'desc';

// Default values for pagination
const defaultPage = '1';
const defaultLimit = '10';

const StatusDot = ({
  variant,
  onCancel,
}: {
  variant: 'done' | 'error' | 'running' | 'canceled' | 'default';
  onCancel?: () => void;
}) => {
  const getColor = () => {
    switch (variant) {
      case 'done':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'running':
        return 'bg-blue-500 animate-pulse';
      case 'canceled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${getColor()}`} />
      <span className="text-sm capitalize">{variant}</span>
      {onCancel && (
        <Button
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation();
            onCancel();
          }}
          className="h-6 w-6 p-0">
          <StopCircle className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
};

export const EvaluationsSection = forwardRef<{ openAddEditor: () => void }>(
  function EvaluationsSection(_, ref) {
    // Hooks
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    useImperativeHandle(ref, () => ({
      openAddEditor: handleOpenAddEditor,
    }));

    // Search params
    const page = parseInt(searchParams.get('page') ?? defaultPage);
    const limit = parseInt(searchParams.get('limit') ?? defaultLimit);

    // States
    const [evaluations, setEvaluations] = useState<
      (EvaluationResponse | EvaluationDetailResponse)[]
    >([]);
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingEvaluation, setEditingEvaluation] =
      useState<EvaluationResponse | null>(null);
    const [activeTab, setActiveTab] = useState('standard');
    const [filters, setFilters] = useState<EvaluationFilters>({
      search: '',
      status: [],
      evaluator: [],
      mode: [],
      passed: 'all',
      scoreMin: '',
      scoreMax: '',
      labelFilters: [],
    });
    const [selectedBulkDeleteEvaluations, setSelectedBulkDeleteEvaluations] =
      useState<Set<string>>(new Set());
    const [totalEvaluations, setTotalEvaluations] = useState(0);

    const handleOpenAddEditor = useCallback(() => {
      setEditingEvaluation(null);
      setEditorOpen(true);
    }, []);

    const handleSelectBulkDelete = useCallback((evaluationName: string) => {
      setSelectedBulkDeleteEvaluations(prev => {
        const newSet = new Set(prev);
        if (prev.has(evaluationName)) {
          newSet.delete(evaluationName);
        } else {
          newSet.add(evaluationName);
        }
        return newSet;
      });
    }, []);

    const {
      data: listEvaluationsData,
      isLoading: listEvaluationsLoading,
      isFetching: listEvaluationsFetching,
      isError: listEvaluationsError,
      error: listEvaluationsErrorObject,
      refetch: loadEvaluations,
    } = useGetAllEvaluationsWithDetails({
      page: page,
      limit: limit,
      sortField: sortField,
      sortDirection: sortDirection,
      filters: filters,
    });

    useEffect(() => {
      if (listEvaluationsData && !listEvaluationsError) {
        setEvaluations(listEvaluationsData.items);
        setSelectedBulkDeleteEvaluations(new Set());
        setTotalEvaluations(listEvaluationsData.count);
      }

      if (listEvaluationsError) {
        toast.error('Failed to Load Evaluations', {
          description:
            listEvaluationsErrorObject instanceof Error
              ? listEvaluationsErrorObject.message
              : 'An unexpected error occurred',
        });
      }
    }, [listEvaluationsError, listEvaluationsData, listEvaluationsErrorObject]);

    useEffect(() => {
      // TODO: FIX THIS
      // const savedFilters = localStorage.getItem('evaluationFilters');
      // if (savedFilters) {
      //   setFilters(JSON.parse(savedFilters));
      // }
    }, []);

    const handlePageChange = (newPage: number) => {
      // Only update the page parameter, leave everything else as-is
      const queryString = createQueryString(
        { page: newPage.toString() },
        searchParams,
      );
      router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, {
        scroll: false,
      });
    };

    const handleItemsPerPageChange = (newLimit: number) => {
      // Only update limit and reset page, leave filters as-is
      const queryString = createQueryString(
        {
          limit: newLimit.toString(),
          page: '1', // Reset to first page on limit change
        },
        searchParams,
      );
      router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, {
        scroll: false,
      });
    };

    const getEvaluatorDisplay = (
      evaluation: EvaluationResponse | EvaluationDetailResponse,
    ) => {
      // First try to get from spec if available (detailed API response)
      const spec = (evaluation as EvaluationDetailResponse)?.spec;
      const evaluatorSpec = spec?.evaluator as { name?: string };
      if (evaluatorSpec?.name) {
        return evaluatorSpec.name;
      }

      // Fallback: extract evaluator name from evaluation name pattern
      // Pattern: {evaluator-name}-{query-name}-eval
      // Examples:
      // cost-evaluator-expensive-complex-query-eval -> cost-evaluator
      // evaluator-llm-with-selector-math-query-2-eval -> evaluator-llm-with-selector
      if (evaluation.name.endsWith('-eval')) {
        const nameWithoutSuffix = evaluation.name.replace(/-eval$/, '');

        // Known evaluator patterns
        const evaluatorPatterns = [
          { prefix: 'cost-evaluator-', name: 'cost-evaluator' },
          { prefix: 'performance-evaluator-', name: 'performance-evaluator' },
          {
            prefix: 'high-performance-evaluator-',
            name: 'high-performance-evaluator',
          },
          {
            prefix: 'evaluator-llm-with-selector-',
            name: 'evaluator-llm-with-selector',
          },
        ];

        for (const pattern of evaluatorPatterns) {
          if (nameWithoutSuffix.startsWith(pattern.prefix)) {
            return pattern.name;
          }
        }

        // Fallback: assume the first few parts are the evaluator name
        const parts = nameWithoutSuffix.split('-');
        if (parts.length >= 2) {
          // Take the first 2-3 parts as evaluator name
          if (parts[0] === 'evaluator' && parts.length > 3) {
            return parts.slice(0, 4).join('-'); // Handle "evaluator-llm-with-selector"
          } else {
            return parts.slice(0, 2).join('-'); // Handle "cost-evaluator", "performance-evaluator"
          }
        }
      }

      return '-';
    };

    const getQueryRefDisplay = (
      evaluation: EvaluationResponse | EvaluationDetailResponse,
    ) => {
      // First try to get from spec if available (detailed API response)
      const spec = (evaluation as EvaluationDetailResponse)?.spec;
      const config = spec?.config as {
        queryRef?: { name?: string };
        datasetRef?: { name?: string };
      };
      const queryRefSpec = config?.queryRef;
      const datasetRefSpec = config?.datasetRef;

      // For dataset evaluations, check for datasetRef first
      const mode = getTypeDisplay(evaluation);
      if (mode === 'dataset' && datasetRefSpec?.name) {
        return datasetRefSpec.name;
      }

      if (queryRefSpec?.name) {
        return queryRefSpec.name;
      }

      // Fallback: extract reference from evaluation name pattern
      // Pattern observed: {evaluator-name}-{query-name/dataset-name}-eval
      // Examples:
      // cost-evaluator-expensive-complex-query-eval -> expensive-complex-query
      // evaluator-llm-with-selector-math-query-2-eval -> math-query-2
      // dataset-evaluator-math-dataset-eval -> math-dataset
      if (evaluation.name.endsWith('-eval')) {
        const nameWithoutSuffix = evaluation.name.replace(/-eval$/, '');

        // Known evaluator prefixes to remove
        const evaluatorPrefixes = [
          'cost-evaluator-',
          'performance-evaluator-',
          'high-performance-evaluator-',
          'evaluator-llm-with-selector-',
        ];

        for (const prefix of evaluatorPrefixes) {
          if (nameWithoutSuffix.startsWith(prefix)) {
            return nameWithoutSuffix.substring(prefix.length);
          }
        }

        // Fallback: assume the last few parts are the reference name
        const parts = nameWithoutSuffix.split('-');
        if (parts.length >= 2) {
          // Take the last 2-3 parts as reference name
          const refName = parts.slice(-3).join('-');
          if (
            refName.includes('query') ||
            refName.includes('dataset') ||
            refName.match(/\d/) ||
            parts.length <= 4
          ) {
            return refName;
          }
        }
      }

      return '-';
    };

    const getTypeDisplay = (
      evaluation: EvaluationResponse | EvaluationDetailResponse,
    ) => {
      const spec = (evaluation as EvaluationDetailResponse)?.spec;
      const specMode = spec?.type as string;
      const basicMode = (evaluation as EvaluationResponse).type;
      return specMode || basicMode || 'unknown';
    };

    const getStatus = (
      evaluation: EvaluationResponse | EvaluationDetailResponse,
    ) => {
      // Try to get phase from basic evaluation first
      let phase = (evaluation as EvaluationResponse).phase;

      // If not found, try to get from detailed response status
      if (!phase) {
        const detailedStatus = (evaluation as EvaluationDetailResponse)
          ?.status as Record<string, unknown>;
        phase = detailedStatus?.phase as string;
      }

      return phase || 'pending';
    };

    const getScoreDisplay = (
      evaluation: EvaluationResponse | EvaluationDetailResponse,
    ) => {
      // Try to get score from basic evaluation first
      let score: string | number | null | undefined = (
        evaluation as EvaluationResponse
      ).score;

      // If not found, try to get from detailed response status
      if (score === null || score === undefined) {
        const detailedStatus = (evaluation as EvaluationDetailResponse)
          ?.status as Record<string, unknown>;
        score = detailedStatus?.score as string | number;
      }

      if (score === null || score === undefined) return '-';
      if (typeof score === 'number') return score.toFixed(2);
      if (typeof score === 'string') return score;
      return String(score);
    };

    const getPassedDisplay = (
      evaluation: EvaluationResponse | EvaluationDetailResponse,
    ) => {
      // Try to get passed from basic evaluation first
      let passed = (evaluation as EvaluationResponse).passed;

      // If not found, try to get from detailed response status
      if (passed === null || passed === undefined) {
        const detailedStatus = (evaluation as EvaluationDetailResponse)
          ?.status as Record<string, unknown>;
        passed = detailedStatus?.passed as boolean;
      }

      if (passed === null || passed === undefined) return '-';
      return passed ? '✓' : '✗';
    };

    // Extract unique values for filter options based on current tab
    const getAvailableEvaluators = () => {
      const evaluators = new Set<string>();
      currentEvaluations.forEach(evaluation => {
        const evaluatorName = getEvaluatorDisplay(evaluation);
        if (evaluatorName !== '-') {
          evaluators.add(evaluatorName);
        }
      });
      return Array.from(evaluators).sort();
    };

    // Separate evaluations by type
    const standardEvaluations = evaluations.filter(evaluation => {
      const mode = getTypeDisplay(evaluation);
      return ['direct', 'query', 'batch', 'manual', 'event'].includes(mode);
    });

    const datasetEvaluations = evaluations.filter(evaluation => {
      const mode = getTypeDisplay(evaluation);
      return mode === 'baseline';
    });

    // Get current evaluations based on active tab
    const currentEvaluations =
      activeTab === 'dataset' ? datasetEvaluations : standardEvaluations;

    // Filter evaluations based on current filters
    const filteredEvaluations = currentEvaluations.filter(evaluation => {
      // Evaluator filter
      if (filters.evaluator.length > 0) {
        const evaluator = getEvaluatorDisplay(evaluation);
        if (!filters.evaluator.includes(evaluator)) return false;
      }

      return true;
    });

    const handleSort = (field: SortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('desc');
      }
    };

    const getStatusBadge = (
      status: string | undefined,
      evaluationName: string,
    ) => {
      const normalizedStatus = status as
        | 'done'
        | 'error'
        | 'running'
        | 'canceled'
        | 'default';
      const variant = ['done', 'error', 'running', 'canceled'].includes(
        status || '',
      )
        ? normalizedStatus
        : 'default';

      return (
        <StatusDot
          variant={variant}
          onCancel={
            status === 'running'
              ? () => handleCancel(evaluationName)
              : undefined
          }
        />
      );
    };

    const handleDelete = async (evaluationName: string) => {
      try {
        await evaluationsService.delete(evaluationName);
        toast.success('Evaluation Deleted', {
          description: 'Successfully deleted evaluation',
        });
        // Reload evaluations
        await loadEvaluations();
      } catch (error) {
        toast.error('Failed to Delete Evaluation', {
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        });
      }
    };

    const handleBulkDelete = async () => {
      try {
        const response = await evaluationsService.bulkDeleteEvaluations(
          Array.from(selectedBulkDeleteEvaluations),
        );

        if (response.deleted > 0 && response.failed === 0) {
          toast.success('Evaluations Bulk Deleted', {
            description: 'Successfully deleted evaluations',
          });
        } else if (response.deleted > 0 && response.failed > 0) {
          toast.warning('Some Evaluations Failed to Delete', {
            description: 'Some evaluations failed to delete',
          });
        } else {
          toast.error('Failed to Bulk Delete Evaluations', {
            description: response.message,
          });
        }
        // Reload evaluations
        await loadEvaluations();
      } catch (error) {
        toast.error('Failed to Bulk Delete Evaluations', {
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        });
      }
    };

    const handleCancel = async (evaluationName: string) => {
      try {
        await evaluationsService.cancel(evaluationName);
        toast.success('Evaluation Canceled', {
          description: 'Successfully canceled evaluation',
        });
        // Reload evaluations
        await loadEvaluations();
      } catch (error) {
        toast.error('Failed to Cancel Evaluation', {
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        });
      }
    };

    const handleSaveEvaluation = async (
      evaluation: (EvaluationCreateRequest | EvaluationUpdateRequest) & {
        id?: string;
      },
    ) => {
      try {
        if (evaluation.id) {
          const updateRequest = evaluation as EvaluationUpdateRequest & {
            id: string;
          };
          await evaluationsService.update(updateRequest.id, updateRequest);
          toast.success('Evaluation Updated', {
            description: 'Successfully updated evaluation',
          });
        } else {
          const createRequest = evaluation as EvaluationCreateRequest;
          await evaluationsService.create(createRequest);
          toast.success('Evaluation Created', {
            description: 'Successfully created evaluation',
          });
        }

        // Reload evaluations
        await loadEvaluations();
      } catch (error) {
        toast.error('Failed to Save Evaluation', {
          description:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        });
      }
    };

    const handleEditEvaluation = (
      evaluation: EvaluationResponse | EvaluationDetailResponse,
    ) => {
      setEditingEvaluation(evaluation as EvaluationResponse);
      setEditorOpen(true);
    };

    const renderEvaluationTable = () => (
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                <th></th>
                <th
                  className="cursor-pointer px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort('name')}>
                  <div className="flex items-center">
                    Name
                    {sortField === 'name' &&
                      (sortDirection === 'desc' ? (
                        <ChevronDown className="ml-1 h-4 w-4" />
                      ) : (
                        <ChevronUp className="ml-1 h-4 w-4" />
                      ))}
                  </div>
                </th>
                <th
                  className="cursor-pointer px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort('age')}>
                  <div className="flex items-center">
                    Age
                    {sortField === 'age' &&
                      (sortDirection === 'desc' ? (
                        <ChevronDown className="ml-1 h-4 w-4" />
                      ) : (
                        <ChevronUp className="ml-1 h-4 w-4" />
                      ))}
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Evaluator
                </th>
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Type
                </th>
                {activeTab !== 'dataset' && (
                  <th className="px-3 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                    Query Ref
                  </th>
                )}
                <th
                  className="cursor-pointer px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort('score')}>
                  <div className="flex items-center">
                    Score
                    {sortField === 'score' &&
                      (sortDirection === 'desc' ? (
                        <ChevronDown className="ml-1 h-4 w-4" />
                      ) : (
                        <ChevronUp className="ml-1 h-4 w-4" />
                      ))}
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Passed
                </th>
                <th
                  className="cursor-pointer px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSort('status')}>
                  <div className="flex items-center">
                    Status
                    {sortField === 'status' &&
                      (sortDirection === 'desc' ? (
                        <ChevronDown className="ml-1 h-4 w-4" />
                      ) : (
                        <ChevronUp className="ml-1 h-4 w-4" />
                      ))}
                  </div>
                </th>
                <th className="px-3 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === 'dataset' ? 8 : 9}
                    className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <DASHBOARD_SECTIONS.evaluations.icon />
                        </EmptyMedia>
                        <EmptyTitle>No Evaluations Yet</EmptyTitle>
                        <EmptyDescription>
                          You haven&apos;t created any evaluations yet. Get
                          started by creating your first evaluation.
                        </EmptyDescription>
                      </EmptyHeader>
                      <EmptyContent>
                        <Button onClick={handleOpenAddEditor}>
                          <Plus className="h-4 w-4" />
                          Create Evaluation
                        </Button>
                      </EmptyContent>
                      <Button
                        variant="link"
                        asChild
                        className="text-muted-foreground"
                        size="sm">
                        <a
                          href="https://mckinsey.github.io/agents-at-scale-ark/reference/evaluations/evaluations/"
                          target="_blank">
                          Learn More <ArrowUpRightIcon />
                        </a>
                      </Button>
                    </Empty>
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map(evaluation => {
                  const status = getStatus(evaluation);
                  return (
                    <tr
                      key={evaluation.name}
                      className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/30"
                      onClick={() => {
                        router.push(`/evaluation/${evaluation.name}`);
                      }}>
                      <td className="w-[40px] text-center text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 p-0"
                            onClick={e => {
                              e.stopPropagation();
                              handleSelectBulkDelete(evaluation.name);
                            }}>
                            {' '}
                            <Checkbox
                              checked={selectedBulkDeleteEvaluations.has(
                                evaluation.name,
                              )}
                            />
                          </Button>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-sm text-gray-900 dark:text-gray-100">
                        {evaluation.name}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {formatAge(
                          (evaluation as EvaluationDetailResponse)?.metadata
                            ?.creationTimestamp as string | undefined,
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {getEvaluatorDisplay(evaluation)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            activeTab === 'dataset'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                          {getTypeDisplay(evaluation)}
                        </span>
                      </td>
                      {activeTab !== 'dataset' && (
                        <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {getQueryRefDisplay(evaluation)}
                        </td>
                      )}
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                        <span className="font-mono">
                          {getScoreDisplay(evaluation)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                        <span
                          className={`text-lg ${(() => {
                            // Get passed value using the same logic as getPassedDisplay
                            let passed = (evaluation as EvaluationResponse)
                              .passed;
                            if (passed === null || passed === undefined) {
                              const detailedStatus = (
                                evaluation as EvaluationDetailResponse
                              )?.status as Record<string, unknown>;
                              passed = detailedStatus?.passed as boolean;
                            }
                            return passed
                              ? 'text-green-600'
                              : passed === false
                                ? 'text-red-600'
                                : 'text-gray-400';
                          })()}`}>
                          {getPassedDisplay(evaluation)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {getStatusBadge(status, evaluation.name)}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleEditEvaluation(evaluation);
                                  }}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit evaluation</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleDelete(evaluation.name);
                                  }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete evaluation</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );

    return (
      <>
        <div className="flex h-full flex-col space-y-4">
          <div className="space-y-4 border-b pb-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                <TabsTrigger value="standard" className="text-sm">
                  Standard (
                  {listEvaluationsLoading ? '-' : standardEvaluations.length})
                </TabsTrigger>
                <TabsTrigger value="dataset" className="text-sm">
                  Baseline (
                  {listEvaluationsLoading ? '-' : datasetEvaluations.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex justify-between">
              <div className="flex-1">
                <EvaluationFilter
                  filters={filters}
                  onFiltersChange={newFilters => {
                    setFilters(newFilters);
                  }}
                  availableEvaluators={getAvailableEvaluators()}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="bg-destructive hover:bg-destructive/10 hover:text-destructive text-white"
                  disabled={
                    selectedBulkDeleteEvaluations.size === 0 ||
                    listEvaluationsLoading
                  }
                  onClick={() => handleBulkDelete()}>
                  <Trash2 className={`h-4 w-4`} />
                  Bulk Delete{' '}
                  {selectedBulkDeleteEvaluations.size > 0 &&
                    `(${selectedBulkDeleteEvaluations.size})`}
                </Button>
                <Button
                  onClick={() => loadEvaluations()}
                  disabled={listEvaluationsFetching || listEvaluationsLoading}>
                  <RefreshCw
                    className={`h-4 w-4 ${listEvaluationsFetching ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          <main className="flex-1 overflow-auto">
            {listEvaluationsFetching ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-muted-foreground">Refetching...</div>
              </div>
            ) : (
              renderEvaluationTable()
            )}
          </main>

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(totalEvaluations / limit)}
            itemsPerPage={limit}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
        <EvaluationEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          evaluation={editingEvaluation}
          onSave={handleSaveEvaluation}
        />
      </>
    );
  },
);
