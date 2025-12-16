import { Response } from 'express';

export const writeSSEEvent = (res: Response, data: unknown): boolean => {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch (error) {
    console.error('Error writing SSE event:', error);
    return false;
  }
};

const SSE_HEARTBEAT_INTERVAL_MS = 30000;

export const startSSEHeartbeat = (res: Response): NodeJS.Timeout => {
  return setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
    }
  }, SSE_HEARTBEAT_INTERVAL_MS);
};
