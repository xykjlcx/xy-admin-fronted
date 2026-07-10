import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const maxTotalBytes = 2_000_000;
const maxJavaScriptChunkBytes = 310_000;

function collectFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(root, entry.name);
    return entry.isDirectory() ? collectFiles(absolutePath) : [absolutePath];
  });
}

function isForbiddenFile(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/');
  const basename = path.basename(normalized);
  return (
    basename.startsWith('.env') ||
    /\.(?:pem|p12|pfx|cer|crt|key)$/i.test(basename) ||
    normalized.includes('/.superpowers/') ||
    normalized.includes('/test-results/') ||
    normalized.includes('/__snapshots__/') ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(basename)
  );
}

function assertRuntimeMarkers(files, target) {
  const readableFiles = files.filter((file) => /\.(?:html|js|css)$/i.test(file));
  const content = readableFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
  if (
    target === 'web' &&
    /\b(?:contextBridge|ipcRenderer|electron-updater|node:fs|node:path)\b/.test(content)
  ) {
    throw new Error('Web Renderer 包含桌面运行时代码');
  }
  if (target === 'desktop' && /\b(?:mockServiceWorker|setupWorker|@faker-js|msw\/browser)\b/.test(content)) {
    throw new Error('Desktop Renderer 包含 Mock 运行时代码');
  }
  if (target === 'desktop' && /\b(?:contextBridge|ipcRenderer|node:fs|node:path)\b/.test(content)) {
    throw new Error('Desktop Renderer 包含 Node 或任意 IPC 代码');
  }
}

export function verifyRendererArtifacts(root, target) {
  if (target !== 'web' && target !== 'desktop') throw new Error('Renderer target 必须是 web 或 desktop');
  const files = collectFiles(root);
  const relativeFiles = files.map((file) => path.relative(root, file));
  const forbiddenFile = relativeFiles.find(isForbiddenFile);
  if (forbiddenFile) throw new Error(`Renderer 包含禁止打包的文件: ${forbiddenFile}`);

  assertRuntimeMarkers(files, target);
  const totalBytes = files.reduce((total, file) => total + statSync(file).size, 0);
  const javaScriptFiles = files.filter((file) => file.endsWith('.js'));
  const largestJavaScriptBytes = Math.max(0, ...javaScriptFiles.map((file) => statSync(file).size));
  if (largestJavaScriptBytes > maxJavaScriptChunkBytes) {
    throw new Error(
      `Renderer 最大 JavaScript chunk ${String(largestJavaScriptBytes)} bytes 超过 ${String(maxJavaScriptChunkBytes)} bytes`,
    );
  }
  if (totalBytes > maxTotalBytes) {
    throw new Error(`Renderer 总体积 ${String(totalBytes)} bytes 超过 ${String(maxTotalBytes)} bytes`);
  }
  return { target, totalBytes, largestJavaScriptBytes, fileCount: files.length };
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) {
  const target = process.argv[2];
  const root = path.join(projectRoot, target === 'desktop' ? 'out/renderer' : 'dist');
  const result = verifyRendererArtifacts(root, target);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
