import { useQuery } from '@tanstack/react-query';

import { queriesService } from './queries';

export const useListQueries = (
  page: number,
  limit: number,
  sortField: string,
  sortDirection: string,
) => {
  return useQuery({
    queryKey: ['list-all-queries', page, limit, sortField, sortDirection],
    queryFn: () => queriesService.list(page, limit, sortField, sortDirection),
  });
};
