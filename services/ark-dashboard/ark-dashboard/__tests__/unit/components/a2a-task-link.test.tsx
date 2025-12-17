import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { A2ATaskLink } from '@/components/a2a-task-link';
import { a2aTasksService } from '@/lib/services/a2a-tasks';

vi.mock('@/lib/services/a2a-tasks', () => ({
  a2aTasksService: {
    get: vi.fn(),
  },
}));

describe('A2ATaskLink', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const renderWithClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>,
    );
  };

  it('should display loading state initially', () => {
    vi.mocked(a2aTasksService.get).mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        }),
    );

    renderWithClient(<A2ATaskLink taskId="task-123" />);

    expect(screen.getByText('Loading task...')).toBeInTheDocument();
  });

  it('should display link to task when data loads successfully', async () => {
    const mockTask = {
      name: 'task-123',
      taskId: 'task-123',
      namespace: 'default',
      a2aServerRef: { name: 'server-1' },
      agentRef: { name: 'agent-1' },
      queryRef: { name: 'query-1' },
      status: {
        phase: 'completed',
        artifacts: [
          {
            artifactId: 'art-1',
            name: 'artifact-1',
            parts: [],
          },
          {
            artifactId: 'art-2',
            name: 'artifact-2',
            parts: [],
          },
        ],
      },
    };

    vi.mocked(a2aTasksService.get).mockResolvedValue(mockTask as any);

    renderWithClient(<A2ATaskLink taskId="task-123" />);

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /view task details/i }),
      ).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: /view task details/i });
    expect(link).toHaveAttribute('href', '/tasks/a2a-task-task-123');
    expect(screen.getByText(/2 artifacts/i)).toBeInTheDocument();
  });

  it('should use provided artifactCount prop over task data', async () => {
    const mockTask = {
      name: 'task-456',
      taskId: 'task-456',
      namespace: 'default',
      a2aServerRef: { name: 'server-1' },
      agentRef: { name: 'agent-1' },
      queryRef: { name: 'query-1' },
      status: {
        phase: 'completed',
        artifacts: [
          {
            artifactId: 'art-1',
            name: 'artifact-1',
            parts: [],
          },
          {
            artifactId: 'art-2',
            name: 'artifact-2',
            parts: [],
          },
          {
            artifactId: 'art-3',
            name: 'artifact-3',
            parts: [],
          },
          {
            artifactId: 'art-4',
            name: 'artifact-4',
            parts: [],
          },
          {
            artifactId: 'art-5',
            name: 'artifact-5',
            parts: [],
          },
        ],
      },
    };

    vi.mocked(a2aTasksService.get).mockResolvedValue(mockTask as any);

    renderWithClient(<A2ATaskLink taskId="task-456" artifactCount={5} />);

    await waitFor(() => {
      expect(screen.getByText(/5 artifacts/i)).toBeInTheDocument();
    });
  });

  it('should display error state when task fails to load', async () => {
    vi.mocked(a2aTasksService.get).mockRejectedValue(
      new Error('Task not found'),
    );

    renderWithClient(<A2ATaskLink taskId="task-error" />);

    await waitFor(() => {
      expect(screen.getByText(/task not found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/task-error/i)).toBeInTheDocument();
  });

  it('should display error state when task data is null', async () => {
    vi.mocked(a2aTasksService.get).mockResolvedValue(null as any);

    renderWithClient(<A2ATaskLink taskId="task-null" />);

    await waitFor(() => {
      expect(screen.getByText(/task not found/i)).toBeInTheDocument();
    });
  });

  it('should not display artifact count when no artifacts', async () => {
    const mockTask = {
      name: 'task-no-artifacts',
      taskId: 'task-no-artifacts',
      namespace: 'default',
      a2aServerRef: { name: 'server-1' },
      agentRef: { name: 'agent-1' },
      queryRef: { name: 'query-1' },
      status: {
        phase: 'completed',
      },
    };

    vi.mocked(a2aTasksService.get).mockResolvedValue(mockTask as any);

    renderWithClient(<A2ATaskLink taskId="task-no-artifacts" />);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /view task details/i });
      expect(link.textContent).not.toMatch(/\d+ artifacts/);
    });
  });

  it('should handle empty artifacts array', async () => {
    const mockTask = {
      name: 'task-empty',
      taskId: 'task-empty',
      namespace: 'default',
      a2aServerRef: { name: 'server-1' },
      agentRef: { name: 'agent-1' },
      queryRef: { name: 'query-1' },
      status: {
        phase: 'completed',
        artifacts: [],
      },
    };

    vi.mocked(a2aTasksService.get).mockResolvedValue(mockTask as any);

    renderWithClient(<A2ATaskLink taskId="task-empty" />);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /view task details/i });
      expect(link.textContent).not.toMatch(/\d+ artifacts/);
    });
  });

  it('should display correct link for different task IDs', async () => {
    const mockTask = {
      name: 'custom-task-id',
      taskId: 'custom-task-id',
      namespace: 'default',
      a2aServerRef: { name: 'server-1' },
      agentRef: { name: 'agent-1' },
      queryRef: { name: 'query-1' },
      status: {
        phase: 'running',
      },
    };

    vi.mocked(a2aTasksService.get).mockResolvedValue(mockTask as any);

    renderWithClient(<A2ATaskLink taskId="custom-task-id" />);

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /view task details/i });
      expect(link).toHaveAttribute('href', '/tasks/a2a-task-custom-task-id');
    });
  });
});
