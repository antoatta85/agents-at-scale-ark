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
