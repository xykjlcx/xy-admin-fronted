import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createDesktopLogger, sanitizeLogMessage } from './desktop-logger';

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('desktop logger', () => {
  test('redacts bearer credentials and URL queries before persistence', () => {
    expect(
      sanitizeLogMessage(
        'Authorization: Bearer secret-token GET https://updates.example.com/file?signature=private&user=1',
      ),
    ).toBe('Authorization: Bearer [redacted] GET https://updates.example.com/file?[redacted]');
  });

  test('writes under the requested directory and rotates logs by size', () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'desktop-logger-'));
    directories.push(directory);
    const logger = createDesktopLogger({
      directory,
      maximumBytes: 100,
      maximumFiles: 2,
      now: () => new Date('2026-07-11T00:00:00.000Z'),
    });

    logger.info('renderer ready', 'x'.repeat(60));
    logger.error('ipc failure', new Error('GET https://api.example.com/private?token=secret'));

    expect(readdirSync(directory).sort()).toEqual(['main.log', 'main.log.1']);
    expect(readFileSync(path.join(directory, 'main.log'), 'utf8')).toContain(
      'https://api.example.com/private?[redacted]',
    );
    expect(readFileSync(path.join(directory, 'main.log.1'), 'utf8')).toContain('renderer ready');
  });
});
