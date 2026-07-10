import { describe, expect, test } from 'vitest';
import { createSpikeResponse } from './desktop-spike-server.mjs';

const rendererOrigin = 'app://renderer';

describe('packaged Spike HTTPS API', () => {
  test('answers an exact Renderer CORS preflight without wildcard access', () => {
    const response = createSpikeResponse({
      method: 'OPTIONS',
      path: '/api/auth/login',
      origin: rendererOrigin,
      headers: { 'access-control-request-headers': 'content-type' },
      body: '',
    });

    expect(response).toMatchObject({
      status: 204,
      headers: {
        'access-control-allow-origin': rendererOrigin,
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'Content-Type, Authorization',
        vary: 'Origin',
      },
    });
    expect(response.headers['access-control-allow-origin']).not.toBe('*');
  });

  test('rejects requests from any other origin', () => {
    expect(
      createSpikeResponse({
        method: 'POST',
        path: '/api/auth/login',
        origin: 'https://evil.example.com',
        headers: {},
        body: JSON.stringify({ username: 'spike-user', password: 'spike-password' }),
      }).status,
    ).toBe(403);
  });

  test('returns contract-valid auth and navigation envelopes before a deliberate protected 401', () => {
    const login = createSpikeResponse({
      method: 'POST',
      path: '/api/auth/login',
      origin: rendererOrigin,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'spike-user', password: 'spike-password' }),
    });
    const me = createSpikeResponse({
      method: 'GET',
      path: '/api/auth/me',
      origin: rendererOrigin,
      headers: { authorization: 'Bearer spike-session-token' },
      body: '',
    });
    const dashboard = createSpikeResponse({
      method: 'GET',
      path: '/api/dashboard/overview',
      origin: rendererOrigin,
      headers: { authorization: 'Bearer spike-session-token' },
      body: '',
    });

    expect(JSON.parse(login.body)).toEqual({ code: 0, data: { token: 'spike-session-token' }, message: '' });
    expect(JSON.parse(me.body)).toMatchObject({ code: 0, data: { user: { username: 'spike-user' } } });
    expect(dashboard.status).toBe(401);
  });

  test('keeps a dedicated chrome-validation session on the dashboard', () => {
    const login = createSpikeResponse({
      method: 'POST',
      path: '/api/auth/login',
      origin: rendererOrigin,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'chrome-user', password: 'spike-password' }),
    });
    const dashboard = createSpikeResponse({
      method: 'GET',
      path: '/api/dashboard/overview',
      origin: rendererOrigin,
      headers: { authorization: 'Bearer chrome-session-token' },
      body: '',
    });

    expect(JSON.parse(login.body)).toMatchObject({ data: { token: 'chrome-session-token' } });
    expect(dashboard.status).toBe(200);
    expect(JSON.parse(dashboard.body)).toMatchObject({
      code: 0,
      data: { company: { name: 'Packaged Chrome' } },
    });
  });
});
