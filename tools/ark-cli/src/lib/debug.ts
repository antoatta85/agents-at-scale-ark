import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.join(process.cwd(), 'log.txt');

export function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logLine = data
    ? `[${timestamp}] ${message}: ${JSON.stringify(data)}\n`
    : `[${timestamp}] ${message}\n`;

  fs.appendFileSync(LOG_FILE, logLine);
}
