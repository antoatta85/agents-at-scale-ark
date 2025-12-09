'use server';

import { sessionsService } from '@/lib/services/sessions';

export async function getSessionsAction() {
  const result = await sessionsService.getSessions(1000);
  return result;
}
