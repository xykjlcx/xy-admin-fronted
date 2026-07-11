import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceExtension = /\.(?:[cm]?[jt]sx?)$/;

function isTestFile(file) {
  return file.includes('/__tests__/') || /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
}

function usesElectronImport(source) {
  return /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](?:electron|electron-updater)(?:['"/])/.test(source);
}

function usesNodeBuiltinImport(source) {
  return /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](?:node:|fs(?:['"/])|path(?:['"/])|child_process(?:['"/]))/.test(
    source,
  );
}

function usesBusinessOrReactImport(source) {
  return /(?:from\s+|import\s*\(\s*)['"](?:react(?:['"/])|@\/(?:modules|routes)(?:['"/])|.*src\/(?:modules|routes)\/)/.test(
    source,
  );
}

function usesWindowDesktop(source) {
  return /\bwindow\s*(?:\.\s*desktop|\[\s*['"]desktop['"]\s*\])/.test(source);
}

function usesDesktopRuntimeBranch(source) {
  return /\b(?:platform\s*\.\s*runtime|runtime)\s*(?:={2,3}|!={1,2})\s*['"]desktop['"]/.test(source);
}

export function findDesktopBoundaryViolations(files) {
  const violations = [];
  for (const [file, source] of files) {
    const normalizedFile = file.replaceAll('\\', '/');
    const testFile = isTestFile(normalizedFile);

    if (normalizedFile.startsWith('src/') && !testFile) {
      if (usesElectronImport(source)) violations.push(`${normalizedFile}: src/** 禁止 Electron import`);
      if (usesNodeBuiltinImport(source))
        violations.push(`${normalizedFile}: src/** 禁止 Node built-in import`);
      if (usesWindowDesktop(source) && normalizedFile !== 'src/lib/platform/desktop.ts') {
        violations.push(`${normalizedFile}: window.desktop 只能出现在平台适配层`);
      }
      if (
        usesDesktopRuntimeBranch(source) &&
        normalizedFile !== 'src/lib/platform/index.ts' &&
        normalizedFile !== 'src/app/host-routing.ts'
      ) {
        violations.push(`${normalizedFile}: desktop runtime 分支只能出现在宿主装配层`);
      }
      if (
        /\bsetToken\s*\(/.test(source) &&
        normalizedFile !== 'src/lib/session-credential-service.ts' &&
        normalizedFile !== 'src/stores/auth.ts'
      ) {
        violations.push(`${normalizedFile}: setToken 只能由 SessionCredentialService 修改`);
      }
      if (
        /\bplatform\s*\.\s*credentials\b/.test(source) &&
        normalizedFile !== 'src/lib/session-credential-service.ts'
      ) {
        violations.push(`${normalizedFile}: credential adapter 只能由 SessionCredentialService 调用`);
      }
      if (/\bplatform\s*\.\s*window\b/.test(source) && !normalizedFile.startsWith('src/app/')) {
        violations.push(`${normalizedFile}: window platform 只能由 App/Shell 消费`);
      }
      if (
        /\bplatform\s*\.\s*updater\b/.test(source) &&
        !normalizedFile.startsWith('src/app/') &&
        !normalizedFile.startsWith('src/lib/platform/')
      ) {
        violations.push(`${normalizedFile}: updater platform 只能由 App/Shell 消费`);
      }
      if (
        normalizedFile.startsWith('src/modules/admin/files/') &&
        (/(?:from\s+|import\s*\()['"]@\/lib\/download['"]/.test(source) || /\bdownloadFile\s*\(/.test(source))
      ) {
        violations.push(`${normalizedFile}: 文件业务必须通过 platform.files 使用宿主能力`);
      }
      if (
        normalizedFile.startsWith('src/modules/admin/files/') &&
        /\bwindow\s*\.\s*location\s*\.\s*origin\b/.test(source)
      ) {
        violations.push(`${normalizedFile}: 分享链接不得读取宿主 window.location.origin`);
      }
    }

    if (normalizedFile.startsWith('electron/') && !testFile) {
      if (/^electron\/main\/download-(?:manager|net)\.[cm]?[jt]s$/.test(normalizedFile)) {
        violations.push(`${normalizedFile}: 文件能力必须归属 electron/files`);
      }
      if (
        /^electron\/main\/(?:electron-updater-port|pending-update-marker|spike-updater|update-controller|update-source)\.[cm]?[jt]s$/.test(
          normalizedFile,
        )
      ) {
        violations.push(`${normalizedFile}: 更新能力必须归属 electron/updater`);
      }
      if (usesBusinessOrReactImport(source)) {
        violations.push(`${normalizedFile}: electron/** 禁止业务或 React import`);
      }
      if (source.includes('process.env') && normalizedFile !== 'electron/config/index.ts') {
        violations.push(`${normalizedFile}: process.env 只能由 electron/config/index.ts 读取`);
      }
      if (/\bipcRenderer\b/.test(source) && !normalizedFile.startsWith('electron/preload/')) {
        violations.push(`${normalizedFile}: ipcRenderer 只能由 Preload 白名单调用`);
      }
      if (
        normalizedFile.startsWith('electron/preload/') &&
        (/(?:ipcRenderer\s*\.\s*(?:send|sendSync|postMessage)\s*\()/.test(source) ||
          /ipcRenderer\s*\.\s*invoke\s*\(\s*(?!ipcChannels\.)/.test(source) ||
          /ipcRenderer\s*\.\s*(?:on|once|addListener|removeListener)\s*\(\s*(?!ipcEvents\.)/.test(source))
      ) {
        violations.push(`${normalizedFile}: Preload 只能通过 ipcChannels 调用 invoke，禁止暴露任意 IPC`);
      }
    }
  }
  return violations;
}

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(absolutePath);
    if (!sourceExtension.test(entry.name)) return [];
    return [[path.relative(root, absolutePath).replaceAll('\\', '/'), readFileSync(absolutePath, 'utf8')]];
  });
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) {
  const violations = findDesktopBoundaryViolations([
    ...collectFiles(path.join(root, 'src')),
    ...collectFiles(path.join(root, 'electron')),
  ]);
  if (violations.length > 0) {
    process.stderr.write(`${violations.join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write('Desktop architecture boundaries: OK\n');
  }
}
