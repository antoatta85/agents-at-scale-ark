import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { describe, expect, it, vi } from 'vitest';

import { A2ATasksSection } from '@/components/sections/a2a-tasks-section';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useListA2ATasks } from '@/lib/services/a2a-tasks-hooks';

vi.mock('@/lib/services/a2a-tasks-hooks', () => ({
    useListA2ATasks: vi.fn(() => ({
        data: {
            items: [
                {
                    name: 'task-1',
                    namespace: 'default',
                    taskId: '123',
                    phase: 'completed',
                    agentRef: { name: 'agent-1' },
                    queryRef: { name: 'query-1' },
                    creationTimestamp: '2023-01-01T00:00:00Z',
                },
                {
                    name: 'task-2',
                    namespace: 'default',
                    taskId: '456',
                    phase: 'running',
                    agentRef: { name: 'agent-2' },
                    queryRef: { name: 'query-2' },
                    creationTimestamp: '2023-01-02T00:00:00Z',
                },
            ],
            count: 2,
        },
        isPending: false,
        error: null,
    })),
}));

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

describe('A2ATasksSection', () => {
    it('should render the table with tasks', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <JotaiProvider>
                    <SidebarProvider>
                        <A2ATasksSection />
                    </SidebarProvider>
                </JotaiProvider>
            </QueryClientProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('task-1')).toBeInTheDocument();
            expect(screen.getByText('task-2')).toBeInTheDocument();
        });
    });

    it('should show empty state when no tasks are present', async () => {
        vi.mocked(useListA2ATasks).mockReturnValue({
            data: { items: [], count: 0 },
            isPending: false,
            error: null,
        } as any);

        render(
            <QueryClientProvider client={queryClient}>
                <JotaiProvider>
                    <SidebarProvider>
                        <A2ATasksSection />
                    </SidebarProvider>
                </JotaiProvider>
            </QueryClientProvider>,
        );

        await waitFor(() => {
            expect(screen.getByText('No A2A Tasks Found')).toBeInTheDocument();
        });
    });

    it('should render refresh button and call refetch when clicked', async () => {
        const mockRefetch = vi.fn();
        vi.mocked(useListA2ATasks).mockReturnValue({
            data: {
                items: [
                    {
                        name: 'task-1',
                        namespace: 'default',
                        taskId: '123',
                        phase: 'completed',
                        agentRef: { name: 'agent-1' },
                        queryRef: { name: 'query-1' },
                        creationTimestamp: '2023-01-01T00:00:00Z',
                    },
                ],
                count: 1,
            },
            isPending: false,
            error: null,
            refetch: mockRefetch,
            isFetching: false,
        } as any);

        render(
            <QueryClientProvider client={queryClient}>
                <JotaiProvider>
                    <SidebarProvider>
                        <A2ATasksSection />
                    </SidebarProvider>
                </JotaiProvider>
            </QueryClientProvider>,
        );

        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        expect(refreshButton).toBeInTheDocument();

        await userEvent.click(refreshButton);
        expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('should render status as colored dot with tooltip', async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <JotaiProvider>
                    <SidebarProvider>
                        <A2ATasksSection />
                    </SidebarProvider>
                </JotaiProvider>
            </QueryClientProvider>,
        );

        await waitFor(() => {
            const statusDots = document.querySelectorAll('.bg-green-300, .bg-blue-300, .bg-yellow-300, .bg-red-300, .bg-gray-300');
            expect(statusDots.length).toBeGreaterThan(0);
        });
    });
});

