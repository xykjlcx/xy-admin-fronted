import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactRoot = path.join(root, 'test-results/electron-spike');
const tlsRoot = path.join(artifactRoot, 'tls');
const keyPath = path.join(tlsRoot, 'localhost-key.pem');
const certPath = path.join(tlsRoot, 'localhost-cert.pem');
const evidencePath = path.join(artifactRoot, 'https-evidence.json');
const nativeUserDataPath = path.join(artifactRoot, 'user-data-native');
const integratedUserDataPath = path.join(artifactRoot, 'user-data-integrated');
const port = 43119;

function localBinary(name) {
  return path.join(root, 'node_modules', '.bin', `${name}${process.platform === 'win32' ? '.cmd' : ''}`);
}

function run(executable, args, environment) {
  const result = spawnSync(executable, args, {
    cwd: root,
    env: environment,
    shell: false,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${path.basename(executable)} 执行失败，退出码 ${String(result.status)}`);
}

function generateCertificate() {
  mkdirSync(tlsRoot, { recursive: true });
  run(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-sha256',
      '-nodes',
      '-days',
      '1',
      '-subj',
      '/CN=localhost',
      '-addext',
      'subjectAltName=DNS:localhost',
      '-keyout',
      keyPath,
      '-out',
      certPath,
    ],
    process.env,
  );
}

function startServer(environment) {
  const child = spawn(process.execPath, ['scripts/desktop-spike-server.mjs'], {
    cwd: root,
    env: environment,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr?.on('data', (chunk) => process.stderr.write(chunk));
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Packaged Spike HTTPS server 启动超时')), 10_000);
    child.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Packaged Spike HTTPS server 提前退出，退出码 ${String(code)}`));
    });
    child.stdout?.on('data', (chunk) => {
      const output = chunk.toString();
      process.stdout.write(output);
      if (!output.includes('SPIKE_SERVER_READY')) return;
      clearTimeout(timeout);
      resolve(child);
    });
  });
}

function packagedExecutable() {
  if (process.platform === 'darwin') {
    const folder = process.arch === 'arm64' ? 'mac-arm64' : 'mac';
    return path.join(
      root,
      'release',
      folder,
      'admin-scaffold-development.app',
      'Contents',
      'MacOS',
      'admin-scaffold-development',
    );
  }
  if (process.platform === 'win32' && process.arch === 'x64') {
    return path.join(root, 'release', 'win-unpacked', 'admin-scaffold-development.exe');
  }
  throw new Error(`当前平台不支持 Packaged Spike: ${process.platform}/${process.arch}`);
}

function buildPackaged(windowChrome, environment) {
  rmSync(path.join(root, 'release'), { recursive: true, force: true });
  run(
    process.execPath,
    ['scripts/desktop-command.mjs', 'build', `--window-chrome=${windowChrome}`],
    environment,
  );
  const builderArgs =
    process.platform === 'darwin' ? ['--mac', `--${process.arch}`, '--dir'] : ['--win', '--x64', '--dir'];
  run(localBinary('electron-builder'), builderArgs, environment);
  const executable = packagedExecutable();
  if (!existsSync(executable)) throw new Error(`Packaged Spike 可执行文件不存在: ${executable}`);
  return executable;
}

function runPackagedSpec(executable, spec, userDataPath, environment) {
  run(localBinary('playwright'), ['test', '-c', 'playwright.electron.config.ts', spec], {
    ...environment,
    SPIKE_APP_EXECUTABLE: executable,
    SPIKE_USER_DATA_PATH: userDataPath,
    SPIKE_DOWNLOAD_PATH: path.join(userDataPath, 'download-evidence.bin'),
  });
}

async function main() {
  rmSync(artifactRoot, { recursive: true, force: true });
  rmSync(path.join(root, 'release'), { recursive: true, force: true });
  mkdirSync(artifactRoot, { recursive: true });
  generateCertificate();

  const environment = {
    ...process.env,
    VITE_API_BASE_URL: `https://localhost:${String(port)}`,
    VITE_WEB_PUBLIC_BASE_URL: 'https://app.example.com',
    DESKTOP_UPDATE_BASE_URL: 'https://updates.example.com',
    DESKTOP_SPIKE_MODE: 'true',
    DESKTOP_ALLOW_INSECURE_LOCALHOST: 'true',
    VITE_ENABLE_MOCK: 'false',
    SPIKE_PORT: String(port),
    SPIKE_TLS_KEY: keyPath,
    SPIKE_TLS_CERT: certPath,
    SPIKE_EVIDENCE_PATH: evidencePath,
  };
  const server = await startServer(environment);

  try {
    const nativeExecutable = buildPackaged('native', environment);
    runPackagedSpec(nativeExecutable, 'e2e/electron/packaged-spike.spec.ts', nativeUserDataPath, environment);
    const integratedExecutable = buildPackaged('integrated', environment);
    runPackagedSpec(
      integratedExecutable,
      'e2e/electron/packaged-chrome.spec.ts',
      integratedUserDataPath,
      environment,
    );
  } finally {
    server.kill('SIGTERM');
  }
}

await main();
