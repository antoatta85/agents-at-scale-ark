import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configMapsService } from '@/lib/services/configmaps';
import { apiClient } from '@/lib/api/client';
import type { ConfigMapData } from '@/lib/services/configmaps';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('configMapsService', () => {
  const mockConfigMapData: ConfigMapData = {
    name: 'test-configmap',
    namespace: 'default',
    data: {
      key1: 'value1',
      examples: '[{"input": "test", "expectedOutput": "result"}]',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should fetch ConfigMap by name', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(mockConfigMapData);

      const result = await configMapsService.get('test-configmap');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/v1/configmaps/test-configmap',
      );
      expect(result).toEqual(mockConfigMapData);
      expect(result.name).toBe('test-configmap');
      expect(result.namespace).toBe('default');
      expect(result.data.key1).toBe('value1');
    });

    it('should handle ConfigMap with empty data', async () => {
      const emptyConfigMap: ConfigMapData = {
        name: 'empty-configmap',
        namespace: 'default',
        data: {},
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(emptyConfigMap);

      const result = await configMapsService.get('empty-configmap');

      expect(result.data).toEqual({});
    });

    it('should handle ConfigMap with JSON data', async () => {
      const jsonConfigMap: ConfigMapData = {
        name: 'json-configmap',
        namespace: 'default',
        data: {
          examples:
            '[{"input":"What is 2+2?","expectedOutput":"4"},{"input":"What is the capital of France?","expectedOutput":"Paris"}]',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(jsonConfigMap);

      const result = await configMapsService.get('json-configmap');

      expect(result.data.examples).toBeDefined();
      const parsed = JSON.parse(result.data.examples);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].input).toBe('What is 2+2?');
      expect(parsed[0].expectedOutput).toBe('4');
    });

    it('should propagate errors from API', async () => {
      const error = new Error('ConfigMap not found');
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      await expect(configMapsService.get('non-existent')).rejects.toThrow(
        'ConfigMap not found',
      );
    });
  });
});
