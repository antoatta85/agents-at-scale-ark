import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ParameterDetailPanel } from '@/components/panels/parameter-detail-panel';
import { configMapsService } from '@/lib/services';

vi.mock('@/lib/services', () => ({
  configMapsService: {
    get: vi.fn(),
  },
}));

describe('ParameterDetailPanel', () => {
  const mockOnParametersChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no parameters', () => {
    render(
      <ParameterDetailPanel
        parameters={[]}
        onParametersChange={mockOnParametersChange}
      />,
    );

    expect(screen.getByText('No parameters configured')).toBeInTheDocument();
  });

  it('should render parameters with direct values', () => {
    const parameters = [
      { name: 'param1', value: 'value1' },
      { name: 'param2', value: 'value2' },
    ];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    expect(screen.getByText('param1')).toBeInTheDocument();
    expect(screen.getByText('param2')).toBeInTheDocument();
    expect(screen.getByText('2 parameters configured')).toBeInTheDocument();
  });

  it('should render parameter with valueFrom ConfigMapKeyRef', () => {
    const parameters = [
      {
        name: 'golden-examples',
        valueFrom: {
          configMapKeyRef: {
            name: 'query-golden-examples',
            key: 'examples',
          },
        },
      },
    ];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    expect(screen.getByText('golden-examples')).toBeInTheDocument();
  });

  it('should display ConfigMap reference info when valueFrom is present', async () => {
    const parameters = [
      {
        name: 'test-param',
        valueFrom: {
          configMapKeyRef: {
            name: 'test-configmap',
            key: 'test-key',
          },
        },
      },
    ];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    const paramCard = screen.getByText('test-param');
    await userEvent.click(paramCard);

    await waitFor(() => {
      expect(screen.getByText(/ConfigMap:/)).toBeInTheDocument();
      expect(screen.getByText(/test-configmap/)).toBeInTheDocument();
      expect(screen.getByText(/test-key/)).toBeInTheDocument();
    });
  });

  it('should fetch and display ConfigMap data when eye icon is clicked', async () => {
    const mockConfigMapData = {
      name: 'query-golden-examples',
      namespace: 'default',
      data: {
        examples: JSON.stringify([
          { input: 'What is 2+2?', expectedOutput: '4' },
          { input: 'What is the capital of France?', expectedOutput: 'Paris' },
        ]),
      },
    };

    vi.mocked(configMapsService.get).mockResolvedValueOnce(mockConfigMapData);

    const parameters = [
      {
        name: 'golden-examples',
        valueFrom: {
          configMapKeyRef: {
            name: 'query-golden-examples',
            key: 'examples',
          },
        },
      },
    ];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    const paramCard = screen.getByText('golden-examples');
    await userEvent.click(paramCard);

    await waitFor(() => {
      const eyeButton = screen.getAllByRole('button').find((button) => {
        const svg = button.querySelector('svg');
        return svg?.classList.contains('lucide-eye');
      });
      expect(eyeButton).toBeInTheDocument();
    });

    const eyeButton = screen.getAllByRole('button').find((button) => {
      const svg = button.querySelector('svg');
      return svg?.classList.contains('lucide-eye');
    });

    if (eyeButton) {
      await userEvent.click(eyeButton);

      await waitFor(() => {
        expect(configMapsService.get).toHaveBeenCalledWith(
          'query-golden-examples',
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Parameter Value Reference')).toBeInTheDocument();
        expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(
          screen.getByText('What is the capital of France?'),
        ).toBeInTheDocument();
        expect(screen.getByText('Paris')).toBeInTheDocument();
        expect(screen.getByText('Showing 2 entries')).toBeInTheDocument();
      });
    }
  });

  it('should display error when ConfigMap fetch fails', async () => {
    vi.mocked(configMapsService.get).mockRejectedValueOnce(
      new Error('ConfigMap not found'),
    );

    const parameters = [
      {
        name: 'test-param',
        valueFrom: {
          configMapKeyRef: {
            name: 'non-existent',
            key: 'examples',
          },
        },
      },
    ];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    const paramCard = screen.getByText('test-param');
    await userEvent.click(paramCard);

    const eyeButton = screen.getAllByRole('button').find((button) => {
      const svg = button.querySelector('svg');
      return svg?.classList.contains('lucide-eye');
    });

    if (eyeButton) {
      await userEvent.click(eyeButton);

      await waitFor(() => {
        expect(screen.getByText('Error loading data')).toBeInTheDocument();
        expect(screen.getByText(/ConfigMap not found/)).toBeInTheDocument();
      });
    }
  });

  it('should show loading state while fetching ConfigMap', async () => {
    vi.mocked(configMapsService.get).mockImplementation(
      () => new Promise(() => {}),
    );

    const parameters = [
      {
        name: 'test-param',
        valueFrom: {
          configMapKeyRef: {
            name: 'test-configmap',
            key: 'examples',
          },
        },
      },
    ];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    const paramCard = screen.getByText('test-param');
    await userEvent.click(paramCard);

    const eyeButton = screen.getAllByRole('button').find((button) => {
      const svg = button.querySelector('svg');
      return svg?.classList.contains('lucide-eye');
    });

    if (eyeButton) {
      await userEvent.click(eyeButton);

      await waitFor(() => {
        expect(
          screen.getByText('Loading ConfigMap data...'),
        ).toBeInTheDocument();
      });
    }
  });

  it('should handle parameter with Secret reference', () => {
    const parameters = [
      {
        name: 'secret-param',
        valueFrom: {
          secretKeyRef: {
            name: 'my-secret',
            key: 'password',
          },
        },
      },
    ];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    expect(screen.getByText('secret-param')).toBeInTheDocument();
  });

  it('should add new parameter when + button is clicked', async () => {
    render(
      <ParameterDetailPanel
        parameters={[]}
        onParametersChange={mockOnParametersChange}
      />,
    );

    const addButton = screen.getAllByRole('button').find((button) => {
      const svg = button.querySelector('svg');
      return svg?.classList.contains('lucide-plus');
    });

    if (addButton) {
      await userEvent.click(addButton);

      expect(mockOnParametersChange).toHaveBeenCalledWith([
        { name: '', value: '' },
      ]);
    }
  });

  it('should delete parameter when X button is clicked', async () => {
    const parameters = [
      { name: 'param1', value: 'value1' },
      { name: 'param2', value: 'value2' },
    ];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    const deleteButtons = screen.getAllByRole('button').filter((button) => {
      const svg = button.querySelector('svg');
      return svg?.classList.contains('lucide-x');
    });

    if (deleteButtons.length > 0) {
      await userEvent.click(deleteButtons[0]);

      expect(mockOnParametersChange).toHaveBeenCalledWith([
        { name: 'param2', value: 'value2' },
      ]);
    }
  });

  it('should expand and collapse parameter details', async () => {
    const parameters = [{ name: 'param1', value: 'value1' }];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    const paramCard = screen.getByText('param1');
    await userEvent.click(paramCard);

    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    await userEvent.click(paramCard);

    await waitFor(() => {
      expect(screen.queryByText('Name')).not.toBeInTheDocument();
    });
  });

  it('should display error message when error prop is provided', () => {
    render(
      <ParameterDetailPanel
        parameters={[]}
        onParametersChange={mockOnParametersChange}
        error="Invalid parameter format"
      />,
    );

    expect(screen.getByText('Invalid parameter format')).toBeInTheDocument();
  });

  it('should close ConfigMap dialog when close button is clicked', async () => {
    const mockConfigMapData = {
      name: 'query-golden-examples',
      namespace: 'default',
      data: {
        examples: JSON.stringify([
          { input: 'Test input', expectedOutput: 'Test output' },
        ]),
      },
    };

    vi.mocked(configMapsService.get).mockResolvedValueOnce(mockConfigMapData);

    const parameters = [
      {
        name: 'golden-examples',
        valueFrom: {
          configMapKeyRef: {
            name: 'query-golden-examples',
            key: 'examples',
          },
        },
      },
    ];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    const paramCard = screen.getByText('golden-examples');
    await userEvent.click(paramCard);

    await waitFor(() => {
      const eyeButton = screen.getAllByRole('button').find((button) => {
        const svg = button.querySelector('svg');
        return svg?.classList.contains('lucide-eye');
      });
      expect(eyeButton).toBeInTheDocument();
    });

    const eyeButton = screen.getAllByRole('button').find((button) => {
      const svg = button.querySelector('svg');
      return svg?.classList.contains('lucide-eye');
    });

    if (eyeButton) {
      await userEvent.click(eyeButton);

      await waitFor(() => {
        expect(screen.getByText('Parameter Value Reference')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');
      await userEvent.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByText('Parameter Value Reference'),
        ).not.toBeInTheDocument();
      });
    }
  });

  it('should display "Long text" badge for parameters with long values', () => {
    const parameters = [
      {
        name: 'long-param',
        value: 'This is a very long text that exceeds 100 characters. '.repeat(3),
      },
    ];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    expect(screen.getByText('Long text')).toBeInTheDocument();
  });

  it('should not show eye icon for parameters without valueFrom', () => {
    const parameters = [{ name: 'param1', value: 'value1' }];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    const paramCard = screen.getByText('param1');
    userEvent.click(paramCard);

    const eyeButtons = screen.queryAllByRole('button').filter((button) => {
      const svg = button.querySelector('svg');
      return svg?.classList.contains('lucide-eye');
    });

    expect(eyeButtons.length).toBe(0);
  });

  it('should handle mixed parameters with value and valueFrom', () => {
    const parameters = [
      { name: 'direct-param', value: 'direct-value' },
      {
        name: 'configmap-param',
        valueFrom: {
          configMapKeyRef: {
            name: 'my-configmap',
            key: 'my-key',
          },
        },
      },
    ];

    render(
      <ParameterDetailPanel
        parameters={parameters}
        onParametersChange={mockOnParametersChange}
      />,
    );

    expect(screen.getByText('direct-param')).toBeInTheDocument();
    expect(screen.getByText('configmap-param')).toBeInTheDocument();
    expect(screen.getByText('2 parameters configured')).toBeInTheDocument();
  });
});
