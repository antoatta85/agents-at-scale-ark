import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { A2ATasksSection } from '@/components/sections/a2a-tasks-section';
import { useListA2ATasks } from '@/lib/services/a2a-tasks-hooks';

vi.mock('@/lib/services/a2a-tasks-hooks');

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
      {
        taskId: 'task-2',
        name: 'Task-2',
        phase: 'pending',
        agentRef: { name: 'Agent-1' },
        queryRef: { name: 'Query-2' },
        creationTimestamp: undefined,
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

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(3);

    expect(rows[1].textContent).toContain(
      'task-1Task 1Agent 1Query 11/1/2023, 1:00:00 AM',
    );
    expect(rows[2].textContent).toContain('task-2Task-2Agent-1Query-2-');
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
});
