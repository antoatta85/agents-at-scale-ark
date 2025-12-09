import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { sessionsService, type Session } from './sessions';

export const GET_SESSIONS_QUERY_KEY = 'get-sessions';
export const GET_SESSION_QUERY_KEY = 'get-session';

export const useGetSessions = () => {
  const query = useQuery({
    queryKey: [GET_SESSIONS_QUERY_KEY],
    queryFn: sessionsService.listSessions,
    retry: false,
  });

  useEffect(() => {
    if (query.error) {
      toast.error('Failed to get Sessions', {
        description:
          query.error instanceof Error
            ? query.error.message
            : 'An unexpected error occurred',
      });
    }
  }, [query.error]);

  return query;
};

export const useGetSession = (sessionId: string) => {
  const query = useQuery({
    queryKey: [GET_SESSION_QUERY_KEY, sessionId],
    queryFn: () => sessionsService.getSession(sessionId),
    enabled: !!sessionId,
    retry: false,
  });

  useEffect(() => {
    if (query.error) {
      toast.error(`Failed to get Session ${sessionId}`, {
        description:
          query.error instanceof Error
            ? query.error.message
            : 'An unexpected error occurred',
      });
    }
  }, [query.error, sessionId]);

  return query;
};

