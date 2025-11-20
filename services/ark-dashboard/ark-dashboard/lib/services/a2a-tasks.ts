import { apiClient } from '@/lib/api/client';
import type {
    A2ATaskResponse,
    A2ATaskListResponse,
    A2ATaskDetailResponse,
} from '@/lib/api/a2a-tasks-types';

interface AxiosError extends Error {
    response?: {
        status: number;
    };
}

export type A2ATask = A2ATaskDetailResponse & {
    id: string;
    phase?: string;
    creationTimestamp?: string;
};

export const a2aTasksService = {
    async getAll(): Promise<A2ATask[]> {
        const response = await apiClient.get<A2ATaskListResponse>('/api/v1/a2a-tasks');

        return response.items.map(item => ({
            ...item,
            id: item.name,
        })) as A2ATask[];
    },
};
