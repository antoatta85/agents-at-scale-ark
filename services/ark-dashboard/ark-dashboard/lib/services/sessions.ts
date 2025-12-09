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

export interface SessionsList {
  sessions: string[];
}

export const sessionsService = {
  async listSessions(): Promise<string[]> {
    try {
      const response = await apiClient.get<SessionsList>('/api/sessions');
      return response?.sessions || [];
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      return [];
    }
  },

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const response = await apiClient.get<Session>(`/api/sessions/${sessionId}`);
      return response || null;
    } catch (error) {
      console.error(`Failed to fetch session ${sessionId}:`, error);
      return null;
    }
  },
};
