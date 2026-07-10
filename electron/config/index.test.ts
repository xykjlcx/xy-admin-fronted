import { describe, expect, test } from 'vitest';
import { parseDesktopEnvironment } from './index';

const productionEnv = {
  NODE_ENV: 'production',
  VITE_API_BASE_URL: 'https://api.example.com/v1',
  VITE_WEB_PUBLIC_BASE_URL: 'https://app.example.com',
  DESKTOP_UPDATE_BASE_URL: 'https://updates.example.com/stable',
  DESKTOP_WINDOW_CHROME: 'integrated',
};

describe('desktop environment', () => {
  test('parses the production host configuration into stable origins', () => {
    expect(parseDesktopEnvironment(productionEnv)).toMatchObject({
      mode: 'production',
      apiBaseUrl: 'https://api.example.com/v1',
      apiOrigin: 'https://api.example.com',
      webPublicBaseUrl: 'https://app.example.com/',
      updateBaseUrl: 'https://updates.example.com/stable/',
      windowChrome: 'integrated',
      allowInsecureLocalhost: false,
    });
  });

  test.each([
    [{ ...productionEnv, VITE_API_BASE_URL: '/api' }, 'VITE_API_BASE_URL'],
    [{ ...productionEnv, VITE_API_BASE_URL: 'http://api.example.com' }, 'VITE_API_BASE_URL'],
    [{ ...productionEnv, DESKTOP_UPDATE_BASE_URL: '' }, 'DESKTOP_UPDATE_BASE_URL'],
    [{ ...productionEnv, DESKTOP_WINDOW_CHROME: 'frameless' }, 'DESKTOP_WINDOW_CHROME'],
  ])('rejects invalid production configuration', (env, key) => {
    expect(() => parseDesktopEnvironment(env)).toThrow(key);
  });

  test('allows an explicit self-signed localhost exception only in Spike mode', () => {
    const spikeEnv = {
      ...productionEnv,
      VITE_API_BASE_URL: 'https://localhost:43119/api',
      DESKTOP_SPIKE_MODE: 'true',
      DESKTOP_ALLOW_INSECURE_LOCALHOST: 'true',
    };

    expect(parseDesktopEnvironment(spikeEnv).allowInsecureLocalhost).toBe(true);
    expect(() =>
      parseDesktopEnvironment({
        ...spikeEnv,
        DESKTOP_SPIKE_MODE: 'false',
      }),
    ).toThrow('DESKTOP_ALLOW_INSECURE_LOCALHOST');
    expect(() => parseDesktopEnvironment(productionEnv)).not.toThrow();
    expect(() =>
      parseDesktopEnvironment({
        ...productionEnv,
        DESKTOP_SPIKE_MODE: 'true',
        DESKTOP_ALLOW_INSECURE_LOCALHOST: 'true',
      }),
    ).toThrow('localhost');
  });
});
