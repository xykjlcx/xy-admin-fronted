import { describe, expect, test } from 'vitest';
import {
  isHealthyRendererUrl,
  rendererRecoveryLogUrl,
  rendererRecoveryUrl,
  shouldShowRendererRecovery,
} from './renderer-health';

describe('renderer health and recovery policy', () => {
  test('accepts only the configured application document as healthy', () => {
    expect(isHealthyRendererUrl('app://renderer/index.html#/admin/dashboard', null)).toBe(true);
    expect(rendererRecoveryUrl).toBe('app://renderer/electron/renderer/recovery.html');
    expect(isHealthyRendererUrl(rendererRecoveryUrl, null)).toBe(false);
    expect(isHealthyRendererUrl('http://127.0.0.1:5173/admin/dashboard', 'http://127.0.0.1:5173/')).toBe(
      true,
    );
    expect(isHealthyRendererUrl('https://evil.example.com/', 'http://127.0.0.1:5173/')).toBe(false);
  });

  test('shows recovery only for a failed main-frame application load', () => {
    expect(
      shouldShowRendererRecovery({ errorCode: -105, isMainFrame: true, failedUrl: 'app://renderer/' }),
    ).toBe(true);
    expect(
      shouldShowRendererRecovery({ errorCode: -3, isMainFrame: true, failedUrl: 'app://renderer/' }),
    ).toBe(false);
    expect(
      shouldShowRendererRecovery({
        errorCode: -105,
        isMainFrame: false,
        failedUrl: 'app://renderer/logo.svg',
      }),
    ).toBe(false);
    expect(
      shouldShowRendererRecovery({ errorCode: -105, isMainFrame: true, failedUrl: rendererRecoveryUrl }),
    ).toBe(false);
    expect(rendererRecoveryLogUrl).toBe('app://recovery/open-logs');
  });
});
