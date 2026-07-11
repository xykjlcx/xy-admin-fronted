import { describe, expect, test, vi } from 'vitest';
import { claimSingleInstance } from './single-instance';

describe('single instance lifecycle', () => {
  test('exits immediately before app readiness when another instance owns the lock', () => {
    const app = {
      requestSingleInstanceLock: vi.fn(() => false),
      exit: vi.fn(),
      on: vi.fn(),
    };

    expect(claimSingleInstance(app, vi.fn())).toBe(false);
    expect(app.exit).toHaveBeenCalledWith(0);
    expect(app.on).not.toHaveBeenCalled();
  });

  test('registers the focus callback only for the lock-owning instance', () => {
    const app = {
      requestSingleInstanceLock: vi.fn(() => true),
      exit: vi.fn(),
      on: vi.fn(),
    };
    const onSecondInstance = vi.fn();

    expect(claimSingleInstance(app, onSecondInstance)).toBe(true);
    expect(app.on).toHaveBeenCalledWith('second-instance', onSecondInstance);
    expect(app.exit).not.toHaveBeenCalled();
  });
});
