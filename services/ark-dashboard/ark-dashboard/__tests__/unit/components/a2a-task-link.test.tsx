/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('should display expand button when task has text parts in artifacts', async () => {
    const mockTask = {
      name: 'task-with-text',
      taskId: 'task-with-text',
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
            parts: [
              {
                kind: 'text',
                text: 'This is some text content',
              },
            ],
          },
        ],
      },
    };

    vi.mocked(a2aTasksService.get).mockResolvedValue(mockTask as any);

    renderWithClient(<A2ATaskLink taskId="task-with-text" />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /expand/i }),
      ).toBeInTheDocument();
    });
  });

  it('should not display expand button when no text parts exist', async () => {
    const mockTask = {
      name: 'task-no-text',
      taskId: 'task-no-text',
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
            parts: [
              {
                kind: 'file',
                uri: 'file.txt',
              },
            ],
          },
        ],
      },
    };

    vi.mocked(a2aTasksService.get).mockResolvedValue(mockTask as any);

    renderWithClient(<A2ATaskLink taskId="task-no-text" />);

    await waitFor(() => {
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', { name: /expand/i }),
    ).not.toBeInTheDocument();
  });

  it('should toggle text content visibility when expand button is clicked', async () => {
    const user = userEvent.setup();
    const mockTask = {
      name: 'task-expandable',
      taskId: 'task-expandable',
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
            parts: [
              {
                kind: 'text',
                text: 'This is expandable text content',
              },
            ],
          },
        ],
      },
    };

    vi.mocked(a2aTasksService.get).mockResolvedValue(mockTask as any);

    renderWithClient(<A2ATaskLink taskId="task-expandable" />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /expand/i }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/this is expandable text content/i),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /expand/i }));

    expect(
      screen.getByText(/this is expandable text content/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /collapse/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /collapse/i }));

    expect(
      screen.queryByText(/this is expandable text content/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
  });

  it('should display all text parts from multiple artifacts when expanded', async () => {
    const user = userEvent.setup();
    const mockTask = {
      name: 'task-multiple-text',
      taskId: 'task-multiple-text',
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
            parts: [
              {
                kind: 'text',
                text: 'First text part',
              },
              {
                kind: 'file',
                uri: 'file.txt',
              },
            ],
          },
          {
            artifactId: 'art-2',
            name: 'artifact-2',
            parts: [
              {
                kind: 'text',
                text: 'Second text part',
              },
            ],
          },
        ],
      },
    };

    vi.mocked(a2aTasksService.get).mockResolvedValue(mockTask as any);

    renderWithClient(<A2ATaskLink taskId="task-multiple-text" />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /expand/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /expand/i }));

    expect(screen.getByText(/first text part/i)).toBeInTheDocument();
    expect(screen.getByText(/second text part/i)).toBeInTheDocument();
  });

  it('should render text as plain text by default', async () => {
    const user = userEvent.setup();
    const mockTask = {
      name: 'task-plain-text',
      taskId: 'task-plain-text',
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
            parts: [
              {
                kind: 'text',
                text: '**Bold text** and *italic text*',
              },
            ],
          },
        ],
      },
    };

    vi.mocked(a2aTasksService.get).mockResolvedValue(mockTask as any);

    renderWithClient(<A2ATaskLink taskId="task-plain-text" />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /expand/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /expand/i }));

    expect(
      screen.getByText(/\*\*bold text\*\* and \*italic text\*/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('strong')).not.toBeInTheDocument();
  });

  it('should render text as markdown when renderMode is "markdown"', async () => {
    const user = userEvent.setup();
    const mockTask = {
      name: 'task-markdown',
      taskId: 'task-markdown',
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
            parts: [
              {
                kind: 'text',
                text: '**Bold text** and *italic text*',
              },
            ],
          },
        ],
      },
    };

    vi.mocked(a2aTasksService.get).mockResolvedValue(mockTask as any);

    renderWithClient(
      <A2ATaskLink taskId="task-markdown" renderMode="markdown" />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /expand/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /expand/i }));

    expect(screen.getByText('Bold text')).toBeInTheDocument();
    expect(screen.getByText('Bold text').tagName).toBe('STRONG');
    expect(screen.getByText('italic text')).toBeInTheDocument();
    expect(screen.getByText('italic text').tagName).toBe('EM');
  });

  it('should render text as plain when renderMode is "text"', async () => {
    const user = userEvent.setup();
    const mockTask = {
      name: 'task-explicit-text',
      taskId: 'task-explicit-text',
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
            parts: [
              {
                kind: 'text',
                text: '# Heading\n\nPlain text',
              },
            ],
          },
        ],
      },
    };

    vi.mocked(a2aTasksService.get).mockResolvedValue(mockTask as any);

    renderWithClient(
      <A2ATaskLink taskId="task-explicit-text" renderMode="text" />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /expand/i }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /expand/i }));

    expect(screen.getByText(/# heading/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});
