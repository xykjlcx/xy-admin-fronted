import { describe, expect, test, vi } from 'vitest';
import { createQuitCoordinator } from './quit-coordinator';

describe('graceful quit coordinator', () => {
  test('prevents ordinary quit until asynchronous cleanup completes, then quits once', async () => {
    let release: (() => void) | undefined;
    const cleanup = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const quit = vi.fn();
    const preventDefault = vi.fn();
    const coordinator = createQuitCoordinator({
      cleanup,
      quit,
      isUpdateInstallRequested: () => false,
      reportError: vi.fn(),
    });

    coordinator({ preventDefault });
    coordinator({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(quit).not.toHaveBeenCalled();

    release?.();
    await vi.waitFor(() => expect(quit).toHaveBeenCalledTimes(1));
    coordinator({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(2);
  });

  test('does not intercept the final updater-controlled quit after install preparation', () => {
    const preventDefault = vi.fn();
    const cleanup = vi.fn();
    const coordinator = createQuitCoordinator({
      cleanup,
      quit: vi.fn(),
      isUpdateInstallRequested: () => true,
      reportError: vi.fn(),
    });

    coordinator({ preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalled();
  });

  test('reports cleanup errors without blocking application shutdown forever', async () => {
    const reportError = vi.fn();
    const quit = vi.fn();
    const coordinator = createQuitCoordinator({
      cleanup: vi.fn().mockRejectedValue(new Error('cleanup failed')),
      quit,
      isUpdateInstallRequested: () => false,
      reportError,
    });

    coordinator({ preventDefault: vi.fn() });

    await vi.waitFor(() => expect(quit).toHaveBeenCalledTimes(1));
    expect(reportError).toHaveBeenCalledWith('download cleanup failed', expect.any(Error));
  });
});
