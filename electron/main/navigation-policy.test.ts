import { describe, expect, test } from 'vitest';
import { assertTrustedSender, decideNavigation } from './navigation-policy';

const allowedExternalHosts = new Set(['docs.example.com']);

describe('desktop navigation policy', () => {
  test('allows only the packaged renderer document to navigate internally', () => {
    expect(decideNavigation('app://renderer/index.html#/admin/dashboard', allowedExternalHosts)).toBe(
      'allow-internal',
    );
    expect(decideNavigation('app://renderer/', allowedExternalHosts)).toBe('allow-internal');
    expect(decideNavigation('app://renderer/assets/main.js', allowedExternalHosts)).toBe('deny');
    expect(decideNavigation('app://other/index.html', allowedExternalHosts)).toBe('deny');
  });

  test('opens only explicitly allowed HTTPS hosts outside Electron', () => {
    expect(decideNavigation('https://docs.example.com/guide', allowedExternalHosts)).toBe('open-external');
    expect(decideNavigation('https://evil.example.com/guide', allowedExternalHosts)).toBe('deny');
    expect(decideNavigation('http://docs.example.com/guide', allowedExternalHosts)).toBe('deny');
    expect(decideNavigation('https://docs.example.com:8443/guide', allowedExternalHosts)).toBe('deny');
  });

  test.each(['file:///tmp/a', 'javascript:alert(1)', 'data:text/html,test'])(
    'rejects dangerous targets: %s',
    (url) => {
      expect(decideNavigation(url, allowedExternalHosts)).toBe('deny');
    },
  );

  test('accepts IPC only from the packaged renderer frame', () => {
    expect(() => assertTrustedSender('app://renderer/index.html#/admin/dashboard')).not.toThrow();
    expect(() => assertTrustedSender('https://api.example.com')).toThrow('拒绝非 Renderer IPC sender');
    expect(() => assertTrustedSender('app://other/index.html')).toThrow('拒绝非 Renderer IPC sender');
  });

  test('accepts IPC only from the exact configured Vite development document', () => {
    const developmentUrl = 'http://localhost:5173/';

    expect(() => assertTrustedSender('http://localhost:5173/#/login', developmentUrl)).not.toThrow();
    expect(() => assertTrustedSender('http://localhost:5174/#/login', developmentUrl)).toThrow(
      '拒绝非 Renderer IPC sender',
    );
    expect(() => assertTrustedSender('http://127.0.0.1:5173/#/login', developmentUrl)).toThrow(
      '拒绝非 Renderer IPC sender',
    );
    expect(() => assertTrustedSender('http://localhost:5173/embedded.html', developmentUrl)).toThrow(
      '拒绝非 Renderer IPC sender',
    );
  });
});
