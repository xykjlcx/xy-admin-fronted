import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const commands = new Set(['dev', 'build', 'make']);
const chromeModes = new Set(['native', 'integrated']);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function requireHttpsUrl(env, key) {
  const value = env[key];
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} 必须是绝对 HTTPS URL`);
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error(`${key} 必须是绝对 HTTPS URL`);
  }
  return url.toString();
}

export function parseDesktopCommand(argv, env = process.env) {
  const [command, ...options] = argv;
  if (!commands.has(command)) throw new Error('桌面命令只能是 dev、build 或 make');

  const chromeOption = options.find((value) => value.startsWith('--window-chrome='));
  const windowChrome = chromeOption ? chromeOption.slice('--window-chrome='.length) : 'native';
  if (!chromeModes.has(windowChrome)) throw new Error('window-chrome 只能是 native 或 integrated');

  const productionUrls =
    command === 'dev'
      ? {}
      : {
          VITE_API_BASE_URL: requireHttpsUrl(env, 'VITE_API_BASE_URL').replace(/\/$/, ''),
          VITE_WEB_PUBLIC_BASE_URL: requireHttpsUrl(env, 'VITE_WEB_PUBLIC_BASE_URL'),
          DESKTOP_UPDATE_BASE_URL: requireHttpsUrl(env, 'DESKTOP_UPDATE_BASE_URL'),
        };

  return {
    command,
    windowChrome,
    environment: {
      ...env,
      ...productionUrls,
      NODE_ENV: command === 'dev' ? (env.NODE_ENV ?? 'development') : 'production',
      VITE_DESKTOP_RUNTIME: 'true',
      VITE_WINDOW_CHROME: windowChrome,
      DESKTOP_WINDOW_CHROME: windowChrome,
    },
  };
}

export function createDesktopCommandPlan(parsed, platform = process.platform) {
  if (parsed.command === 'dev') return [{ executable: 'electron-vite', args: ['dev'] }];
  const buildSteps = [
    { executable: 'tsc', args: ['-b', '--noEmit'] },
    { executable: 'tsc', args: ['-p', 'tsconfig.desktop.json', '--noEmit'] },
    { executable: 'node', args: ['scripts/desktop-boundary-guard.mjs'] },
    { executable: 'electron-vite', args: ['build'] },
    { executable: 'node', args: ['scripts/verify-renderer-artifacts.mjs', 'desktop'] },
  ];
  if (parsed.command === 'build') return buildSteps;
  if (platform === 'darwin') {
    return [...buildSteps, { executable: 'electron-builder', args: ['--mac', '--arm64', '--x64'] }];
  }
  if (platform === 'win32') {
    return [...buildSteps, { executable: 'electron-builder', args: ['--win', '--x64'] }];
  }
  throw new Error(`不支持在 ${platform} 构建桌面安装包`);
}

function localBinary(executable) {
  if (executable === 'node') return process.execPath;
  const extension = process.platform === 'win32' ? '.cmd' : '';
  return path.join(root, 'node_modules', '.bin', `${executable}${extension}`);
}

export function runDesktopCommand(parsed) {
  for (const step of createDesktopCommandPlan(parsed)) {
    const result = spawnSync(localBinary(step.executable), step.args, {
      cwd: root,
      env: parsed.environment,
      shell: false,
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${step.executable} 执行失败，退出码 ${String(result.status)}`);
  }
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) runDesktopCommand(parseDesktopCommand(process.argv.slice(2)));
