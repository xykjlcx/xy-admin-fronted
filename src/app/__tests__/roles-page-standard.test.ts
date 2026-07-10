import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '../../..');
const rolesPageDir = resolve(projectRoot, 'src/modules/admin/roles');

test('roles 使用 Users 同款纵切业务包', () => {
  expect(existsSync(rolesPageDir)).toBe(true);
});

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return [];
      return collectSourceFiles(path);
    }
    if (!path.endsWith('.tsx')) return [];
    return [path];
  });
}

function readSource(file: string) {
  return readFileSync(file, 'utf8');
}

test('roles 页面层不直接写原生交互控件', () => {
  if (!existsSync(rolesPageDir)) return;
  const forbidden = [/<button\b/, /<input\b/, /<select\b/, /<textarea\b/];

  for (const file of collectSourceFiles(rolesPageDir)) {
    const source = readSource(file);

    for (const pattern of forbidden) {
      expect(source, `${file.replace(`${projectRoot}/`, '')} should use ui/pro components`).not.toMatch(pattern);
    }
  }
});

test('roles 页面层不写内联 style', () => {
  if (!existsSync(rolesPageDir)) return;
  for (const file of collectSourceFiles(rolesPageDir)) {
    expect(readSource(file), `${file.replace(`${projectRoot}/`, '')} should move visual styles into ui/pro components`).not.toContain(
      'style={{',
    );
  }
});
