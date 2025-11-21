import type {
  A2ATaskDetailResponse,
  A2ATaskListResponse,
} from '@/lib/api/a2a-tasks-types';
import { apiClient } from '@/lib/api/client';

export type A2ATask = A2ATaskDetailResponse & {
  id: string;
  phase?: string;
  creationTimestamp?: string;
};

export const a2aTasksService = {
  async getAll(): Promise<A2ATask[]> {
    const response =
      await apiClient.get<A2ATaskListResponse>('/api/v1/a2a-tasks');

    return response.items.map(item => ({
      ...item,
      id: item.name,
    })) as A2ATask[];
  },
};
