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
      filters,
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
