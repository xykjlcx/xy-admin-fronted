import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

interface DesktopLoggerOptions {
  directory: string;
  maximumBytes?: number;
  maximumFiles?: number;
  now?: () => Date;
}

export function sanitizeLogMessage(message: string): string {
  return message
    .replace(/Bearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]+/gi, '$1?[redacted]');
}

function errorSummary(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return typeof error === 'string' ? error : 'Unknown error';
}

export function createDesktopLogger(options: DesktopLoggerOptions) {
  const maximumBytes = options.maximumBytes ?? 1_048_576;
  const maximumFiles = options.maximumFiles ?? 3;
  const now = options.now ?? (() => new Date());
  const logPath = path.join(options.directory, 'main.log');

  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new Error('maximumBytes 必须是正安全整数');
  }
  if (!Number.isSafeInteger(maximumFiles) || maximumFiles < 1) {
    throw new Error('maximumFiles 必须是正安全整数');
  }

  const rotateIfNeeded = (incomingBytes: number): void => {
    if (!existsSync(logPath) || statSync(logPath).size + incomingBytes <= maximumBytes) return;
    const lastBackup = `${logPath}.${String(maximumFiles - 1)}`;
    if (maximumFiles > 1) rmSync(lastBackup, { force: true });
    for (let index = maximumFiles - 2; index >= 1; index -= 1) {
      const source = `${logPath}.${String(index)}`;
      if (existsSync(source)) renameSync(source, `${logPath}.${String(index + 1)}`);
    }
    if (maximumFiles > 1) renameSync(logPath, `${logPath}.1`);
    else rmSync(logPath, { force: true });
  };

  const write = (level: 'INFO' | 'ERROR', event: string, detail?: string): void => {
    mkdirSync(options.directory, { recursive: true, mode: 0o700 });
    const message = sanitizeLogMessage([event, detail].filter(Boolean).join(' '));
    const line = `${now().toISOString()} ${level} ${message}\n`;
    rotateIfNeeded(Buffer.byteLength(line));
    appendFileSync(logPath, line, { encoding: 'utf8', mode: 0o600 });
  };

  return {
    directory: options.directory,
    info(event: string, detail?: string): void {
      write('INFO', event, detail);
    },
    error(event: string, error?: unknown): void {
      write('ERROR', event, error === undefined ? undefined : errorSummary(error));
    },
  };
}
