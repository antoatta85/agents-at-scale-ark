import { apiClient } from '../api/client';

export interface Session {
  id: string;
  queries: Query[];
  conversations: Conversation[];  // Standalone conversations (no query_id)
}

export interface Conversation {
  id: string;
  firstMessage: Record<string, unknown> | null;
  lastMessage: Record<string, unknown> | null;
  messages?: Array<Record<string, unknown>>;  // All messages in chronological order
}

export interface Query {
  id: string;
  name: string;
  status: 'in_progress' | 'completed';
  duration_ms: number | null;
  conversations: Conversation[];  // Conversations belonging to this query
}

export interface SessionsListResponse {
  items: Array<{ sessionId: string; memoryName: string }>;
  total?: number;
}

export const sessionsService = {
  async listSessions(): Promise<string[]> {
    try {
      const response = await apiClient.get<SessionsListResponse>('/api/v1/sessions');
      return response?.items?.map(item => item.sessionId) || [];
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      return [];
    }
  },

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      // TODO: ark-api needs a GET /v1/sessions/{sessionId} endpoint
      // For now, we'll need to call ark-sessions directly or implement the endpoint
      const response = await apiClient.get<Session>(`/api/v1/sessions/${sessionId}`);
      return response || null;
    } catch (error) {
      console.error(`Failed to fetch session ${sessionId}:`, error);
      return null;
    }
  },
};
