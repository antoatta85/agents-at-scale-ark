import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { A2ATasksSection } from '@/components/sections/a2a-tasks-section';
import { useListA2ATasks } from '@/lib/services/a2a-tasks-hooks';

vi.mock('@/lib/services/a2a-tasks-hooks');

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('A2ATasksSection', () => {
  const mockUseListA2ATasks = useListA2ATasks as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    mockUseListA2ATasks.mockReturnValue({
      isPending: true,
      data: undefined,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    render(<A2ATasksSection />);
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
  });

  it('renders error state correctly', () => {
    const error = new Error('Failed to fetch');
    mockUseListA2ATasks.mockReturnValue({
      isPending: false,
      data: undefined,
      error: error,
      refetch: vi.fn(),
      isFetching: false,
    });

    render(<A2ATasksSection />);
    expect(screen.getByText('Error loading tasks')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
  });

  it('renders empty state correctly', () => {
    mockUseListA2ATasks.mockReturnValue({
      isPending: false,
      data: { items: [] },
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    render(<A2ATasksSection />);
    expect(screen.getByText('No A2A Tasks Found')).toBeInTheDocument();
  });

  it('renders tasks correctly', () => {
    const tasks = [
      {
        taskId: 'task-1',
        name: 'Task 1',
        phase: 'completed',
        agentRef: { name: 'Agent 1' },
        queryRef: { name: 'Query 1' },
        creationTimestamp: '2023-01-01T00:00:00Z',
      },
    ];

    mockUseListA2ATasks.mockReturnValue({
      isPending: false,
      data: { items: tasks },
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    render(<A2ATasksSection />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Agent 1')).toBeInTheDocument();
    expect(screen.getByText('Query 1')).toBeInTheDocument();
  });

  it('calls refetch when refresh button is clicked', async () => {
    const mockRefetch = vi.fn();
    mockUseListA2ATasks.mockReturnValue({
      isPending: false,
      data: { items: [] },
      error: null,
      refetch: mockRefetch,
      isFetching: false,
    });

    render(<A2ATasksSection />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await userEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('navigates to task details when a task is clicked', async () => {
    const tasks = [
      {
        taskId: 'task-1',
        name: 'Task 1',
        phase: 'completed',
        agentRef: { name: 'Agent 1' },
        queryRef: { name: 'Query 1' },
        creationTimestamp: '2023-01-01T00:00:00Z',
      },
    ];

    mockUseListA2ATasks.mockReturnValue({
      isPending: false,
      data: { items: tasks },
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    });

    render(<A2ATasksSection />);

    const taskRow = screen.getByText('Task 1');
    await userEvent.click(taskRow);

    expect(mockPush).toHaveBeenCalledWith('/tasks/Task 1');
  });
});
