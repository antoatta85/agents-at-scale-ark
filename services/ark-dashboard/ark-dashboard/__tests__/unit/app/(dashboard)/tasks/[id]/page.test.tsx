import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams, useRouter } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

import A2ATaskPage from '@/app/(dashboard)/tasks/[id]/page';
import { useA2ATask } from '@/lib/services/a2a-tasks-hooks';

// Mock next/navigation
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(() => ({
    back: mockBack,
  })),
}));

// Mock services
vi.mock('@/lib/services/a2a-tasks-hooks', () => ({
  useA2ATask: vi.fn(),
}));

// Mock components that might cause issues in unit tests
vi.mock('@/components/common/page-header', () => ({
  PageHeader: ({ currentPage }: { currentPage: string }) => (
    <div data-testid="page-header">{currentPage}</div>
  ),
}));

describe('A2ATaskPage', () => {
  it('should show loading state', () => {
    vi.mocked(useParams).mockReturnValue({ id: 'task-1' });
    vi.mocked(useA2ATask).mockReturnValue({
      isLoading: true,
      data: undefined,
      error: null,
    } as any);

    render(<A2ATaskPage />);
    expect(screen.getByText('Loading task...')).toBeInTheDocument();
  });

  it('should show error state', () => {
    vi.mocked(useParams).mockReturnValue({ id: 'task-1' });
    vi.mocked(useA2ATask).mockReturnValue({
      isLoading: false,
      data: undefined,
      error: new Error('Failed to load'),
    } as any);

    render(<A2ATaskPage />);
    expect(screen.getByText('Error loading task')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('should render task details', async () => {
    vi.mocked(useParams).mockReturnValue({ id: 'task-1' });
    const mockTask = {
      name: 'Test Task',
      taskId: 'task-1',
      phase: 'completed',
      protocolState: 'finished',
      agentRef: { name: 'Agent Smith' },
      queryRef: { name: 'Query 1' },
      a2aServerRef: { name: 'Server 1' },
      creationTimestamp: '2023-01-01T10:00:00Z',
      status: {
        completionTime: '2023-01-01T10:05:00Z',
      },
      input: 'Do something',
      parameters: { param1: 'value1' },
    };

    vi.mocked(useA2ATask).mockReturnValue({
      isLoading: false,
      data: mockTask,
      error: null,
    } as any);

    render(<A2ATaskPage />);

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('task-1')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('Agent Smith')).toBeInTheDocument();
    expect(screen.getByText('Do something')).toBeInTheDocument();
  });
});
