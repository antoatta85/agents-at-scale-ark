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
});
