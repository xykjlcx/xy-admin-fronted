import { readFileSync, writeFileSync } from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rendererOrigin = 'app://renderer';
const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' };

function envelope(data) {
  return JSON.stringify({ code: 0, data, message: '' });
}

function corsHeaders(origin) {
  if (origin !== rendererOrigin) return {};
  return {
    'access-control-allow-origin': rendererOrigin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
    vary: 'Origin',
  };
}

function response(status, body, origin, headers = {}) {
  return { status, headers: { ...jsonHeaders, ...corsHeaders(origin), ...headers }, body };
}

export function createSpikeResponse(request) {
  if (request.origin !== rendererOrigin)
    return response(403, JSON.stringify({ error: 'origin denied' }), request.origin);
  if (request.method === 'OPTIONS') return response(204, '', request.origin);

  if (request.method === 'POST' && request.path === '/api/auth/login') {
    let input;
    try {
      input = JSON.parse(request.body);
    } catch {
      return response(400, JSON.stringify({ error: 'invalid json' }), request.origin);
    }
    const token =
      input?.username === 'spike-user' && input?.password === 'spike-password'
        ? 'spike-session-token'
        : input?.username === 'chrome-user' && input?.password === 'spike-password'
          ? 'chrome-session-token'
          : null;
    if (!token) {
      return response(401, JSON.stringify({ error: 'invalid credentials' }), request.origin);
    }
    return response(200, envelope({ token }), request.origin);
  }

  const bearerToken = request.headers.authorization?.replace(/^Bearer\s+/, '') ?? '';
  const authorized = bearerToken === 'spike-session-token' || bearerToken === 'chrome-session-token';
  if (!authorized) return response(401, JSON.stringify({ error: 'unauthorized' }), request.origin);

  if (request.method === 'GET' && request.path === '/api/auth/me') {
    return response(
      200,
      envelope({
        user: { id: 'spike-user-id', name: 'Packaged Spike', username: 'spike-user' },
        roles: ['administrator'],
        permissions: ['dashboard:view'],
      }),
      request.origin,
    );
  }
  if (request.method === 'GET' && request.path === '/api/subsystems') {
    return response(
      200,
      envelope([
        {
          key: 'admin',
          label: { 'zh-CN': '后台管理', 'en-US': 'Administration' },
          desc: { 'zh-CN': '后台管理', 'en-US': 'Administration' },
          icon: 'layout-dashboard',
          color: 'var(--accent-emphasis)',
          home: '/admin/dashboard',
          builtin: true,
          enabled: true,
          sort: 1,
        },
      ]),
      request.origin,
    );
  }
  if (request.method === 'GET' && request.path === '/api/menus') {
    return response(
      200,
      envelope([
        {
          id: 'spike-dashboard',
          parentId: null,
          subsystemKey: 'admin',
          type: 'menu',
          label: { 'zh-CN': '工作台', 'en-US': 'Dashboard' },
          icon: 'layout-dashboard',
          path: '/admin/dashboard',
          permission: 'dashboard:view',
          visible: true,
          sort: 1,
        },
      ]),
      request.origin,
    );
  }
  if (request.method === 'GET' && request.path === '/api/dashboard/overview') {
    if (bearerToken === 'chrome-session-token') {
      return response(
        200,
        envelope({
          company: {
            mark: 'C',
            name: 'Packaged Chrome',
            status: 'Verified',
            meta: 'Electron packaged window chrome evidence',
          },
          metrics: {
            newMembers: { value: '24', delta: '6', negative: false },
            activeUsers: { value: '96', delta: '12', negative: false },
            newRoles: { value: '3', delta: '1', negative: false },
            auditLogs: { value: '1,284', delta: '38', negative: true },
          },
          todo: {
            stats: {
              pending: { value: '10', label: 'Pending' },
              done: { value: '52', label: 'Done' },
              overdue: { value: '3', label: 'Overdue' },
            },
            items: {
              phone: { title: 'Call', time: '09:00-12:00', status: 'In progress' },
              onboard: { title: 'Visit', time: '12:00-15:00', status: 'Urgent' },
              interview: { title: 'Meeting', time: '14:00-15:00', status: 'Pending' },
            },
          },
        }),
        request.origin,
      );
    }
    return response(401, JSON.stringify({ code: 401, data: null, message: 'expired' }), request.origin);
  }
  return response(404, JSON.stringify({ error: 'not found' }), request.origin);
}

export function startSpikeServer({ port, keyPath, certPath, evidencePath }) {
  const evidence = { expectedOrigin: rendererOrigin, requests: [] };
  const persistEvidence = () => writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  persistEvidence();

  const server = https.createServer(
    { key: readFileSync(keyPath), cert: readFileSync(certPath) },
    (request, result) => {
      const chunks = [];
      let size = 0;
      request.on('data', (chunk) => {
        size += chunk.length;
        if (size > 1_048_576) request.destroy(new Error('request body too large'));
        else chunks.push(chunk);
      });
      request.on('end', () => {
        const requestUrl = new URL(request.url ?? '/', `https://localhost:${String(port)}`);
        const headers = Object.fromEntries(
          Object.entries(request.headers).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(', ') : (value ?? ''),
          ]),
        );
        const origin = headers.origin ?? '';
        const method = request.method ?? 'GET';
        evidence.requests.push({
          method,
          path: requestUrl.pathname,
          origin,
          preflight: method === 'OPTIONS',
          requestedHeaders: headers['access-control-request-headers'] ?? '',
          hasAuthorization: Boolean(headers.authorization),
        });
        persistEvidence();

        const spikeResponse = createSpikeResponse({
          method,
          path: requestUrl.pathname,
          origin,
          headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
        result.writeHead(spikeResponse.status, spikeResponse.headers);
        result.end(spikeResponse.body);
      });
    },
  );
  server.listen(port, '127.0.0.1');
  return server;
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) {
  const port = Number(process.env.SPIKE_PORT);
  const keyPath = process.env.SPIKE_TLS_KEY;
  const certPath = process.env.SPIKE_TLS_CERT;
  const evidencePath = process.env.SPIKE_EVIDENCE_PATH;
  if (!Number.isInteger(port) || !keyPath || !certPath || !evidencePath) {
    throw new Error('SPIKE_PORT、SPIKE_TLS_KEY、SPIKE_TLS_CERT、SPIKE_EVIDENCE_PATH 必须配置');
  }
  const server = startSpikeServer({ port, keyPath, certPath, evidencePath });
  server.on('listening', () => process.stdout.write('SPIKE_SERVER_READY\n'));
  const close = () => server.close(() => process.exit(0));
  process.on('SIGTERM', close);
  process.on('SIGINT', close);
}
