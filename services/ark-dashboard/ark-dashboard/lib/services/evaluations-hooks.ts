import { useQuery } from '@tanstack/react-query';

import type { EvaluationFilters } from '../../components/filtering/evaluations-filter';
import { evaluationsService } from './evaluations';

type Props = {
  enhanced?: boolean;
  page: number;
  limit: number;
  sortField?: string;
  sortDirection?: string;
  filters?: EvaluationFilters;
};

export const useGetAllEvaluationsWithDetails = ({
  enhanced = false,
  page,
  limit,
  sortField,
  sortDirection,
  filters,
}: Props) => {
  return useQuery({
    queryKey: [
      'get-all-evaluations-with-details',
      enhanced,
      page,
      limit,
      sortField,
      sortDirection,
      filters?.status,
      filters?.mode,
      filters?.passed,
      filters?.search,
      filters?.scoreMin,
      filters?.scoreMax,
      filters?.evaluator,
      filters?.labelFilters
        .filter(filter => filter.key && filter.value)
        .map(filter => `${filter.key},${filter.value}`),
    ],
    queryFn: async () => {
      return await evaluationsService.getAll(
        enhanced,
        page,
        limit,
        sortField,
        sortDirection,
        filters,
      );
    },
  });
};
