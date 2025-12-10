import { apiClient } from '@/lib/api/client';

export interface ConfigMapData {
  name: string;
  namespace: string;
  data: Record<string, string>;
}

export const configMapsService = {
  async get(name: string): Promise<ConfigMapData> {
    const response = await apiClient.get<ConfigMapData>(
      `/api/v1/configmaps/${name}`,
    );
    return response;
  },
};
