# M0 骨架期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 搭出脚手架的全部"模具"：工程底座、五维主题 token、三布局 Shell、数据流（http/MSW/菜单 API）、鉴权与权限、DataTable v1 + 成员与部门垂直切片页、验收工具链。

**Architecture:** Vite SPA；TanStack Router file-based 路由（staticData 声明权限元数据，页面资源从路由树推导）；服务端数据全走 TanStack Query（含菜单/me），zustand 只存外观/token/折叠；MSW 网络层 mock（dynamic import 剥离）；纯 CSS 变量主题（原型 FLAVORS 为权威源），Shell = token → 布局（策略注册）→ 部件三层。

**Tech Stack:** pnpm, Vite, React 19, TypeScript strict, TanStack Router/Query/Table, Tailwind CSS v4, shadcn/ui, zustand, react-hook-form + zod, MSW 2, @faker-js/faker, react-i18next, lucide-react, Vitest + Testing Library, Playwright。

**权威参照物：** 仓库内 `后台管理脚手架.dc.html`（下称"原型"）。执行任务时按行号区间对照提取精确样式；与 README.md 冲突时以原型代码为准。设计文档：`docs/superpowers/specs/2026-07-02-admin-scaffold-frontend-design.md`（下称"spec"）。

**全局纪律（每个 task 都要遵守）：**
- 组件代码禁止十六进制色值/`rounded-[Npx]` 任意值——只用语义 token（Task 3 上 ESLint 规则）
- 所有界面文案写 `t('<ns>.<key>')`，不写硬编码中文（词条同步写进 `locales/zh-CN/*.json`；en-US 本期只建文件不翻译）
- 宽度类样式一律 px；字号/间距用 Tailwind 默认 scale
- 每个 task 结束必须 `pnpm typecheck && pnpm test` 通过再 commit

**文件结构总览（M0 涉及）：** 见 spec §4。本 plan 创建的文件在各 task 的 Files 列出。

---

## Phase 1：工程底座（Task 1-6）

### Task 1: 项目初始化

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `.gitignore`, `.prettierrc`, `eslint.config.js`

- [ ] **Step 1: 脚手架初始化**

```bash
cd /Users/ocean/Documents/通用脚手架前端
pnpm create vite@latest app --template react-ts
# 生成到 app/ 子目录后把内容搬到仓库根（保留已有 docs/ README.md 原型文件）：
rsync -a app/ ./ --exclude node_modules && rm -rf app
pnpm install
pnpm add @tanstack/react-router @tanstack/react-query @tanstack/react-table zustand react-hook-form zod react-i18next i18next lucide-react
pnpm add -D @tanstack/router-plugin @tanstack/router-devtools msw @faker-js/faker vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react prettier typescript-eslint @playwright/test
```

- [ ] **Step 2: tsconfig strict + 路径别名**

`tsconfig.json` 的 compilerOptions 确保含：

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "baseUrl": ".",
  "paths": { "@/*": ["src/*"] }
}
```

`vite.config.ts`：

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

- [ ] **Step 3: package.json scripts**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "build:demo": "tsc -b && vite build --mode demo",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest run",
    "lint": "eslint src"
  }
}
```

创建 `.env.development`（`VITE_ENABLE_MOCK=true`）、`.env.demo`（`VITE_ENABLE_MOCK=true`）、`.env.production`（`VITE_ENABLE_MOCK=false`）。

- [ ] **Step 4: 验证启动**

Run: `pnpm dev` → 打开 http://localhost:5173 出默认页；`pnpm typecheck` 无错。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: Vite + TS strict + TanStack 依赖初始化"
```

### Task 2: Tailwind v4 + 主题 token 层（模具中的模具）

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/lib/appearance-dom.ts`
- Modify: `index.html`（FOUC 内联脚本）, `src/main.tsx`
- Test: `src/lib/__tests__/appearance-dom.test.ts`

- [ ] **Step 1: 安装 Tailwind v4**

```bash
pnpm add tailwindcss @tailwindcss/vite
```

`vite.config.ts` plugins 数组加入 `tailwindcss()`（`import tailwindcss from '@tailwindcss/vite'`）。

- [ ] **Step 2: 写 tokens.css（值来自原型 L4777-4808，一字不改）**

```css
/* src/styles/tokens.css —— 权威源：原型 FLAVORS 对象（L4796-4805）。
   耦合规则见 spec §8.1：暗色下 --pri-soft 与主题色无关。 */

:root, [data-flavor='feishu'][data-mode='light'] {
  --pri: #3370ff; --pri-soft: #eef3ff;
  --bg: #f5f6f7; --canvas: #eceef1; --surface: #ffffff; --chrome: #ffffff;
  --surface-2: #f2f3f5; --surface-blur: rgba(255, 255, 255, 0.72);
  --text: #1f2329; --text-2: #4e5969; --text-3: #8f959e; --border: #e5e6eb;
}
[data-flavor='feishu'][data-mode='dark'] {
  --pri-soft: rgba(255, 255, 255, 0.08);
  --bg: #111318; --canvas: #0c0d10; --surface: #1b1d23; --chrome: #16181d;
  --surface-2: #262931; --surface-blur: rgba(27, 29, 35, 0.72);
  --text: #e7e9ec; --text-2: #a3aab3; --text-3: #7a818b; --border: #2c2f38;
}
[data-flavor='claude'][data-mode='light'] {
  --bg: #f0eee6; --canvas: #e7e3d7; --surface: #fdfcf8; --chrome: #f4f1e8;
  --surface-2: #efece1; --surface-blur: rgba(244, 241, 232, 0.78);
  --text: #2a2521; --text-2: #6b6459; --text-3: #978f80; --border: #e5e0d3;
}
[data-flavor='claude'][data-mode='dark'] {
  --pri-soft: rgba(255, 255, 255, 0.09);
  --bg: #1c1917; --canvas: #161311; --surface: #262220; --chrome: #211d1a;
  --surface-2: #302b27; --surface-blur: rgba(33, 29, 26, 0.78);
  --text: #ece6dd; --text-2: #a89f92; --text-3: #7d7568; --border: #3a342e;
}

:root {
  /* 主题色派生（--pri/--pri-soft 亮色值由 JS 注入覆盖，见 appearance-dom.ts） */
  --pri-hover: color-mix(in srgb, var(--pri) 85%, black);
  /* 语义色（README Design Tokens 段） */
  --success: #16a34a; --success-soft: #e8f7ee;
  --warning: #ff8000; --warning-soft: #fff3e8;
  --danger: #f53f3f; --danger-soft: #feecec;
  /* 圆角乘法体系（spec §8.1）：sharp 0.28 / default 1 / round 1.55 */
  --radius-factor: 1;
  --radius-sm: calc(6px * var(--radius-factor));
  --radius-md: calc(8px * var(--radius-factor));   /* 输入/按钮 */
  --radius-lg: calc(12px * var(--radius-factor));  /* 卡片 */
  --radius-xl: calc(14px * var(--radius-factor));  /* 大卡 */
}
[data-radius='sharp'] { --radius-factor: 0.28; }
[data-radius='round'] { --radius-factor: 1.55; }
```

- [ ] **Step 3: global.css（@theme 映射 + 基础样式）**

```css
/* src/styles/global.css */
@import 'tailwindcss';
@import './tokens.css';

@theme inline {
  /* Tailwind 工具类词汇 → 原型语义 token（业务代码只准用右侧语义，见 CLAUDE.md 铁律） */
  --color-bg: var(--bg);
  --color-canvas: var(--canvas);
  --color-surface: var(--surface);
  --color-chrome: var(--chrome);
  --color-surface-2: var(--surface-2);
  --color-text: var(--text);
  --color-text-2: var(--text-2);
  --color-text-3: var(--text-3);
  --color-border: var(--border);
  --color-pri: var(--pri);
  --color-pri-soft: var(--pri-soft);
  --color-pri-hover: var(--pri-hover);
  --color-success: var(--success);
  --color-danger: var(--danger);
  --color-warning: var(--warning);
  --color-success-soft: var(--success-soft);
  --color-warning-soft: var(--warning-soft);
  --color-danger-soft: var(--danger-soft);
  --color-surface-blur: var(--surface-blur);
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
  --font-sans: 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', system-ui, sans-serif;
}

html { font-family: var(--font-sans); }
html[data-zoom='sm'] { zoom: 0.9; }
html[data-zoom='lg'] { zoom: 1.08; }  /* 原型实际系数 1.08（L2848），README"110%"有误 */
body { margin: 0; background: var(--bg); color: var(--text); font-size: 14px;
  -webkit-font-smoothing: antialiased; }
.tabular-nums { font-variant-numeric: tabular-nums; }
/* 滚动条、遮罩/抽屉/弹窗/切页动画 keyframes：照原型 L12-L30 原样复制 5 组 @keyframes：
   ovl-fade / sheet-in-right / modal-in / pg-fade / pg-slide / pg-up / pg-scale */
```

- [ ] **Step 4: appearance-dom.ts（外观 → DOM 的唯一写入口，含耦合矩阵）**

```ts
// src/lib/appearance-dom.ts —— 外观状态写入 <html> 的唯一出口；耦合规则集中在此
export type Flavor = 'feishu' | 'claude';
export type Mode = 'light' | 'dark';
export type Zoom = 'sm' | 'md' | 'lg';
export type Radius = 'sharp' | 'default' | 'round';

export const ACCENTS = [
  { key: 'blue', pri: '#3370ff', soft: '#eef3ff' },
  { key: 'claude', pri: '#c96442', soft: '#f8ede7' },
  { key: 'green', pri: '#16a34a', soft: '#e8f7ee' },
  { key: 'violet', pri: '#7c3aed', soft: '#f3edff' },
] as const;
export type AccentKey = (typeof ACCENTS)[number]['key'] | 'custom';

export function flavorDefaultAccent(flavor: Flavor): AccentKey {
  return flavor === 'claude' ? 'claude' : 'blue';   // 原型 L4785
}

export function hexToSoft(hex: string): string {    // 原型 L4787
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},.12)`;
}

export interface AppearanceState {
  flavor: Flavor; mode: Mode; accent: AccentKey; customAccent: string;
  zoom: Zoom; radius: Radius;
}

export function applyAppearance(s: AppearanceState): void {
  const el = document.documentElement;
  el.dataset.flavor = s.flavor;
  el.dataset.mode = s.mode;
  el.dataset.radius = s.radius === 'default' ? '' : s.radius;
  el.dataset.zoom = s.zoom === 'md' ? '' : s.zoom;
  const acc = s.accent === 'custom'
    ? { pri: s.customAccent, soft: hexToSoft(s.customAccent) }
    : ACCENTS.find((a) => a.key === s.accent) ?? ACCENTS[0];
  el.style.setProperty('--pri', acc.pri);
  // 耦合规则（原型 L4798-4803）：暗色下 soft 固定白 alpha，与主题色无关
  if (s.mode === 'light') el.style.setProperty('--pri-soft', acc.soft);
  else el.style.removeProperty('--pri-soft');   // 交还给 tokens.css 的 dark 规则
}
```

- [ ] **Step 5: TDD 测试（先跑失败再实现的顺序在本 task 允许倒置——值为静态映射，直接断言）**

```ts
// src/lib/__tests__/appearance-dom.test.ts
import { applyAppearance, hexToSoft, flavorDefaultAccent } from '@/lib/appearance-dom';

const base = { flavor: 'feishu', mode: 'light', accent: 'blue', customAccent: '#000000', zoom: 'md', radius: 'default' } as const;

test('亮色注入预设 soft', () => {
  applyAppearance({ ...base });
  expect(document.documentElement.style.getPropertyValue('--pri')).toBe('#3370ff');
  expect(document.documentElement.style.getPropertyValue('--pri-soft')).toBe('#eef3ff');
});
test('暗色不注入 soft（耦合规则：交还 CSS 的白 alpha）', () => {
  applyAppearance({ ...base, mode: 'dark' });
  expect(document.documentElement.style.getPropertyValue('--pri-soft')).toBe('');
});
test('自定义色 soft 公式', () => {
  expect(hexToSoft('#c96442')).toBe('rgba(201,100,66,.12)');
});
test('claude flavor 默认陶土橙', () => {
  expect(flavorDefaultAccent('claude')).toBe('claude');
});
```

Run: `pnpm test` → 4 passed。

- [ ] **Step 6: index.html FOUC 内联脚本（body 前、样式后）**

```html
<script>
  (function () {
    try {
      var s = JSON.parse(localStorage.getItem('appearance') || '{}').state || {};
      var el = document.documentElement;
      el.dataset.flavor = s.flavor || 'feishu';
      el.dataset.mode = s.mode || 'light';
      if (s.radius && s.radius !== 'default') el.dataset.radius = s.radius;
      if (s.zoom && s.zoom !== 'md') el.dataset.zoom = s.zoom;
    } catch (e) {}
  })();
</script>
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: 主题 token 体系（FLAVORS 权威值 + 耦合矩阵 + zoom + 圆角因子 + FOUC）"
```

### Task 3: token 快照测试 + ESLint 铁律规则

**Files:**
- Create: `src/styles/__tests__/tokens.snapshot.test.ts`, `eslint.config.js`（追加规则）

- [ ] **Step 1: token 快照测试（确定性验收，spec §13.1）**

思路：jsdom 不解析 CSS 文件，改为直接读 `tokens.css` 文本断言 4 组 × 12 变量的字面值。

```ts
// src/styles/__tests__/tokens.snapshot.test.ts
import { readFileSync } from 'node:fs';
const css = readFileSync('src/styles/tokens.css', 'utf8');

// 权威值表：原型 L4796-4805 逐字对照。
// ⚠️ spec §13.1 要求全表逐值断言（12 变量 × 4 flavor×mode 块 + :root 语义色/圆角），
// MUST_CONTAIN 必须覆盖 tokens.css 的每一条变量声明（静态硬编码表，禁止运行时从
// tokens.css 动态提取——那会让断言跟着文件漂移，失去守护意义）。
// 验收标准：突变任一 token 值（如 --pri 改错色）必须至少 FAIL 一条。
const MUST_CONTAIN = [
  /* 全表 58 条，从 tokens.css 逐条提取硬编码。断言带结尾分号做精确声明匹配，
     防数值前缀碰撞（'--radius-factor: 1' 会被 '1.55' 子串误命中）。示例： */
  '--bg: #f5f6f7;', '--chrome: #16181d;', '--surface: #fdfcf8;', '--canvas: #e7e3d7;',
  '--surface-blur: rgba(33, 29, 26, 0.78);', '--pri-soft: rgba(255, 255, 255, 0.08);',
  '--text-3: #978f80;', '--border: #3a342e;',
  /* …其余全部声明（含 :root 的 --pri/--pri-soft/语义色×6/--pri-hover） */
];
test.each(MUST_CONTAIN)('token %s 与原型一致', (t) => expect(css).toContain(t));
test('圆角因子三档 + 乘法公式', () => {
  expect(css).toContain('--radius-factor: 1');
  expect(css).toContain('--radius-factor: 0.28');
  expect(css).toContain('--radius-factor: 1.55');
  for (const n of [6, 8, 12, 14]) expect(css).toContain(`calc(${n}px * var(--radius-factor))`);
});
```

- [ ] **Step 2: ESLint 禁 hex/任意圆角（no-restricted-syntax）**

`eslint.config.js` 追加（对 `src/**/*.tsx` 生效，排除 `styles/`、`appearance-dom.ts`、`icon-registry`）：

```js
{
  files: ['src/**/*.tsx'],
  ignores: ['src/components/ui/**'],
  rules: {
    'no-restricted-syntax': ['error',
      { selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]", message: '禁止硬编码色值，使用语义 token（bg/surface/text/pri…）' },
      { selector: "Literal[value=/rounded-\\[/]", message: '禁止任意圆角值，使用 rounded-sm/md/lg/xl（乘法 token）' },
    ],
  },
}
```

- [ ] **Step 3: 验证**

Run: `pnpm test && pnpm lint` → 全绿。故意在任一组件写 `#fff` 验证 lint 报错后撤销。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: token 快照验收 + ESLint 色值/圆角铁律"
```

### Task 4: http client + envelope + adapter（TDD）

**Files:**
- Create: `src/lib/http/client.ts`, `src/lib/http/adapter.ts`, `src/lib/http/errors.ts`, `src/lib/http/events.ts`
- Test: `src/lib/http/__tests__/client.test.ts`

- [ ] **Step 1: 先写失败测试**

```ts
// src/lib/http/__tests__/client.test.ts
import { http } from '@/lib/http/client';
import { BizError, AuthExpiredError } from '@/lib/http/errors';
import { authEvents } from '@/lib/http/events';
import { setupServer } from 'msw/node';
import { http as mswHttp, HttpResponse } from 'msw';

const server = setupServer(
  mswHttp.get('/api/ok', () => HttpResponse.json({ code: 0, data: { id: 1 }, message: '' })),
  mswHttp.get('/api/biz-err', () => HttpResponse.json({ code: 4001, data: null, message: '余额不足' })),
  mswHttp.get('/api/expired', () => new HttpResponse(null, { status: 401 })),
);
beforeAll(() => server.listen()); afterAll(() => server.close());

test('code=0 拆包返回 data', async () => {
  await expect(http.get('/api/ok')).resolves.toEqual({ id: 1 });
});
test('code!=0 抛 BizError 带 message', async () => {
  await expect(http.get('/api/biz-err')).rejects.toThrow(BizError);
});
test('401 抛 AuthExpiredError 并发布 auth:expired 事件', async () => {
  const spy = vi.fn(); authEvents.on('expired', spy);
  await expect(http.get('/api/expired')).rejects.toThrow(AuthExpiredError);
  expect(spy).toHaveBeenCalled();
});
```

Run: `pnpm test client` → FAIL（模块不存在）。

- [ ] **Step 2: 实现**

```ts
// src/lib/http/errors.ts
export class BizError extends Error {
  constructor(public code: number, message: string) { super(message); this.name = 'BizError'; }
}
export class AuthExpiredError extends Error { name = 'AuthExpiredError'; }
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'HttpError'; }
}
```

```ts
// src/lib/http/events.ts —— http ↔ router 解耦（spec §9）
type Handler = () => void;
const handlers = new Set<Handler>();
export const authEvents = {
  on: (_: 'expired', h: Handler) => handlers.add(h),
  emit: (_: 'expired') => handlers.forEach((h) => h()),
};
```

```ts
// src/lib/http/adapter.ts —— 防腐层：接真后端只改此文件（spec §5.2）
export interface Envelope<T> { code: number; data: T; message: string }
export const adapter = {
  mapRequestParams: (p: Record<string, unknown>) => p,            // 如 page→pageNum 在此改写
  parseEnvelope: <T>(json: unknown): Envelope<T> => json as Envelope<T>, // 多形状归一在此
  isOk: (code: number) => code === 0,                              // code 语义（200 vs 0）在此
  mapPermission: (code: string) => code,                           // 权限符映射钩子（spec §7.5）
};
```

```ts
// src/lib/http/client.ts
import { adapter } from './adapter';
import { BizError, AuthExpiredError, HttpError } from './errors';
import { authEvents } from './events';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
let getToken: () => string | null = () => null;
export function bindTokenGetter(fn: () => string | null) { getToken = fn; }

async function request<T>(method: string, url: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  const qs = params ? `?${new URLSearchParams(adapter.mapRequestParams(params) as Record<string, string>)}` : '';
  const token = getToken();
  const res = await fetch(`${BASE}${url}${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) { authEvents.emit('expired'); throw new AuthExpiredError('登录已过期'); }
  if (!res.ok) throw new HttpError(res.status, res.statusText);
  const env = adapter.parseEnvelope<T>(await res.json());
  if (!adapter.isOk(env.code)) throw new BizError(env.code, env.message);
  return env.data;
}
export const http = {
  get: <T>(url: string, params?: Record<string, unknown>) => request<T>('GET', url, undefined, params),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body),
  del: <T>(url: string) => request<T>('DELETE', url),
};
```

- [ ] **Step 3: 跑测试通过 → Commit**

Run: `pnpm test client` → 3 passed。

```bash
git add -A && git commit -m "feat: http client（envelope 拆包/错误分类/adapter 防腐层/auth 事件）"
```

### Task 5: MSW 装配 + mock 内存 DB 骨架 + auth 域

**Files:**
- Create: `src/mocks/browser.ts`, `src/mocks/db.ts`, `src/modules/admin/mocks/auth.handlers.ts`, `public/mockServiceWorker.js`（msw init 生成）
- Modify: `src/main.tsx`（启动时序）
- Test: `src/mocks/__tests__/auth.handlers.test.ts`

- [ ] **Step 1: msw init**

```bash
pnpm msw init public --save
```

- [ ] **Step 2: db.ts（内存数据库骨架 + 多角色账号种子）**

```ts
// src/mocks/db.ts —— 关系型内存库；M0 只建 auth/menu/subsystem 域，M1 扩其余域
import { faker } from '@faker-js/faker/locale/zh_CN';

export interface MockUser {
  id: string; username: string; password: string; name: string;
  roles: string[]; permissions: string[];   // 通配符演示：admin 账号 ['*:*:*']
}
export const db = {
  users: [
    { id: 'u1', username: 'admin', password: 'admin123', name: '超级管理员', roles: ['superadmin'], permissions: ['*:*:*'] },
    { id: 'u2', username: 'viewer', password: 'viewer123', name: faker.person.fullName(), roles: ['viewer'],
      permissions: ['dashboard:view', 'iam:user:view', 'iam:dept:view'] },
  ] as MockUser[],
  sessions: new Map<string, string>(),   // token -> userId
};
```

- [ ] **Step 3: auth handlers（照 spec §6 AuthProvider 契约）**

```ts
// src/modules/admin/mocks/auth.handlers.ts
import { http, HttpResponse } from 'msw';
import { db } from '@/mocks/db';

const ok = <T>(data: T) => HttpResponse.json({ code: 0, data, message: '' });
const biz = (code: number, message: string) => HttpResponse.json({ code, data: null, message });

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const { username, password } = (await request.json()) as { username: string; password: string };
    const user = db.users.find((u) => u.username === username && u.password === password);
    if (!user) return biz(4010, '用户名或密码错误');
    const token = `mock-token-${user.id}-${Date.now()}`;
    db.sessions.set(token, user.id);
    return ok({ token });
  }),
  http.get('/api/auth/me', ({ request }) => {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const userId = token && db.sessions.get(token);
    const user = db.users.find((u) => u.id === userId);
    if (!user) return new HttpResponse(null, { status: 401 });
    const { password: _, ...safe } = user;
    return ok({ user: safe, roles: user.roles, permissions: user.permissions });
  }),
  http.post('/api/auth/logout', () => ok(null)),
];
```

- [ ] **Step 4: browser.ts + main.tsx 启动时序（强制约定 spec §5.3）**

```ts
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { authHandlers } from '@/modules/admin/mocks/auth.handlers';

export async function enableMocking() {
  const worker = setupWorker(...authHandlers);
  await worker.start({ onUnhandledRequest: 'bypass' });
}
```

```ts
// src/main.tsx —— MSW ready 前不 mount（router loader 竞态防护）
async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCK === 'true') {
    const { enableMocking } = await import('./mocks/browser');   // dynamic import：生产 DCE 剥离
    await enableMocking();
  }
  const { mountApp } = await import('./app/mount');
  mountApp();
}
void bootstrap();
```

- [ ] **Step 5: 测试（msw/node 复用同一批 handlers 直连断言登录流）+ 生产剥离验证**

```ts
// src/mocks/__tests__/auth.handlers.test.ts
import { setupServer } from 'msw/node';
import { authHandlers } from '@/modules/admin/mocks/auth.handlers';
const server = setupServer(...authHandlers);
beforeAll(() => server.listen()); afterAll(() => server.close());

test('登录成功返回 token，me 返回权限集', async () => {
  const login = await (await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'admin123' }) })).json();
  expect(login.data.token).toMatch(/^mock-token-/);
  const me = await (await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${login.data.token}` } })).json();
  expect(me.data.permissions).toEqual(['*:*:*']);
});
```

Run: `pnpm test && pnpm build && ! grep -r "faker" dist/assets/`（生产包无 faker，spec §13.5）。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: MSW 装配（启动时序/生产剥离）+ mock db + auth 域"
```

### Task 6: i18n 架构 + LocalizedString

**Files:**
- Create: `src/lib/i18n.ts`, `src/lib/localized.ts`, `src/locales/zh-CN/common.json`, `src/locales/en-US/common.json`（空壳）, `src/locales/zh-CN/admin.json`, `src/locales/en-US/admin.json`
- Test: `src/lib/__tests__/localized.test.ts`

- [ ] **Step 1: 失败测试（数据侧 fallback 链，spec §11.2）**

```ts
// src/lib/__tests__/localized.test.ts
import { lv } from '@/lib/localized';
test('取当前语言', () => expect(lv({ 'zh-CN': '运单', 'en-US': 'Shipments' }, 'en-US')).toBe('Shipments'));
test('缺失回退 zh-CN', () => expect(lv({ 'zh-CN': '运单' }, 'en-US')).toBe('运单'));
test('再缺回退首个非空', () => expect(lv({ 'ja-JP': '運送' }, 'en-US')).toBe('運送'));
test('空对象返回空串', () => expect(lv({}, 'zh-CN')).toBe(''));
```

- [ ] **Step 2: 实现**

```ts
// src/lib/localized.ts
export type LocalizedString = Record<string, string>;
export function lv(ls: LocalizedString | undefined, locale: string): string {
  if (!ls) return '';
  // || 而非 ??：空串视同缺失继续回退（多语言输入框删空保存的现实场景）
  return ls[locale] || ls['zh-CN'] || Object.values(ls).find(Boolean) || '';
}
```

```ts
// src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCommon from '@/locales/zh-CN/common.json';
import zhAdmin from '@/locales/zh-CN/admin.json';
import enCommon from '@/locales/en-US/common.json';
import enAdmin from '@/locales/en-US/admin.json';

export const i18nInit = i18n.use(initReactI18next).init({
  lng: localStorage.getItem('locale') ?? 'zh-CN',
  fallbackLng: 'zh-CN',
  resources: {
    'zh-CN': { common: zhCommon, admin: zhAdmin },
    'en-US': { common: enCommon, admin: enAdmin },
  },
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});
```

`zh-CN/common.json` 初始词条（后续 task 随写随加）：

```json
{ "app": { "name": "通用后台管理" },
  "actions": { "create": "新增", "edit": "编辑", "delete": "删除", "detail": "详情", "search": "搜索", "confirm": "确定", "cancel": "取消", "export": "导出" },
  "auth": { "login": "登录", "logout": "退出登录", "username": "用户名", "password": "密码" } }
```

- [ ] **Step 3: 跑测试通过 → Commit**

```bash
git add -A && git commit -m "feat: i18n 装配（namespace 分包）+ LocalizedString fallback 链"
```

---

## Phase 2：数据流与鉴权（Task 7-10）

### Task 7: zustand stores（appearance / auth token）

**Files:**
- Create: `src/stores/appearance.ts`, `src/stores/auth.ts`
- Test: `src/stores/__tests__/appearance.test.ts`

- [ ] **Step 1: appearance store（persist key 必须叫 `appearance`——Task 2 的 FOUC 脚本读它）**

```ts
// src/stores/appearance.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyAppearance, flavorDefaultAccent, type AppearanceState } from '@/lib/appearance-dom';

interface AppearanceStore extends AppearanceState {
  layout: 'sidebar' | 'rail' | 'inset';
  pageAnim: 'none' | 'fade' | 'slide' | 'up' | 'scale';
  collapsed: Record<string, boolean>;               // per-layout（spec §8.2）
  set: (patch: Partial<AppearanceStore>) => void;
  setFlavor: (f: AppearanceState['flavor']) => void; // 耦合：切 flavor 重置 accent
  toggleCollapsed: (layoutKey: string) => void;
}

export const useAppearance = create<AppearanceStore>()(
  persist(
    (set, get) => ({
      flavor: 'feishu', mode: 'light', accent: 'blue', customAccent: '#c96442',
      zoom: 'md', radius: 'default', layout: 'sidebar', pageAnim: 'fade', collapsed: {},
      set: (patch) => { set(patch); applyAppearance({ ...get(), ...patch }); },
      setFlavor: (flavor) => get().set({ flavor, accent: flavorDefaultAccent(flavor) }),  // 原型 L4951
      toggleCollapsed: (k) => set((s) => ({ collapsed: { ...s.collapsed, [k]: !s.collapsed[k] } })),
    }),
    {
      name: 'appearance',
      // Task 2 review I-2：rehydrate 必须重放 accent 注入，否则 F5 后自选主题色丢失回蓝
      onRehydrateStorage: () => (state) => { if (state) applyAppearance(state); },
    },
  ),
);
```

- [ ] **Step 2: auth store（铁律：只存 token）**

```ts
// src/stores/auth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore { token: string | null; setToken: (t: string | null) => void; }
export const useAuth = create<AuthStore>()(
  persist((set) => ({ token: null, setToken: (token) => set({ token }) }), { name: 'auth' }),
);
```

- [ ] **Step 3: 测试耦合规则**

```ts
// src/stores/__tests__/appearance.test.ts
import { useAppearance } from '@/stores/appearance';
test('切 flavor 重置 accent 为 flavor 默认（原型耦合规则）', () => {
  useAppearance.getState().set({ accent: 'violet' });
  useAppearance.getState().setFlavor('claude');
  expect(useAppearance.getState().accent).toBe('claude');
  useAppearance.getState().setFlavor('feishu');
  expect(useAppearance.getState().accent).toBe('blue');
});
```

Run: `pnpm test appearance` → passed。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: appearance/auth stores（per-layout 折叠 + flavor 耦合 + token-only）"
```

### Task 8: 路由装配 + 鉴权守卫 + 401/403/404

> 来自 Task 6 review 的待办：① i18n resources 聚合收敛到 `src/locales/index.ts`（唯一聚合点，i18n.ts 只 import 它——否则加子系统时硬编码 import 会破坏"整目录删除"承诺，删除清单的 locale 步骤 = 删 json + 删 index 两行）；② mount 前 `await i18nInit`（比照 MSW 启动纪律，防将来接 lazy-load backend 退化）；③ LanguageMenu 写 localStorage 用 `LOCALE_STORAGE_KEY` 常量（已在 lib/i18n-config.ts）。

**Files:**
- Create: `src/app/mount.tsx`, `src/app/providers.tsx`, `src/routes/__root.tsx`, `src/routes/login.tsx`, `src/routes/_auth.tsx`, `src/routes/_auth/admin/dashboard.tsx`（占位内容，M1 充实）, `src/app/query.ts`, `src/modules/admin/api/auth.api.ts`
- Test: 手动 e2e 流（本 task 验收即登录闭环）

- [ ] **Step 1: auth API 模块 + me query**

```ts
// src/modules/admin/api/auth.api.ts
import { http, bindTokenGetter } from '@/lib/http/client';
import { queryOptions } from '@tanstack/react-query';
import { useAuth } from '@/stores/auth';

bindTokenGetter(() => useAuth.getState().token);

export interface MeDto { user: { id: string; name: string; username: string }; roles: string[]; permissions: string[] }
export const authApi = {
  login: (dto: { username: string; password: string }) => http.post<{ token: string }>('/api/auth/login', dto),
  me: () => http.get<MeDto>('/api/auth/me'),
  logout: () => http.post<null>('/api/auth/logout'),
};
export const meQuery = queryOptions({ queryKey: ['auth', 'me'], queryFn: authApi.me, staleTime: 5 * 60_000 });
```

- [ ] **Step 2: providers + queryClient + router 实例**

```ts
// src/app/query.ts
import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
```

```tsx
// src/app/mount.tsx
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { routeTree } from '@/routeTree.gen';
import { queryClient } from './query';
import { authEvents } from '@/lib/http/events';
import { useAuth } from '@/stores/auth';
import '@/lib/i18n';
import '@/styles/global.css';

export const router = createRouter({ routeTree, context: { queryClient }, defaultPreload: 'intent' });
declare module '@tanstack/react-router' { interface Register { router: typeof router } }

// 401 统一处理：清 token → 失效 me → 回登录（事件解耦，spec §9）
authEvents.on('expired', () => {
  useAuth.getState().setToken(null);
  queryClient.removeQueries({ queryKey: ['auth'] });
  void router.navigate({ to: '/login', search: { redirect: location.pathname } });
});

export function mountApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>,
  );
}
```

- [ ] **Step 3: 路由骨架**

```tsx
// src/routes/__root.tsx
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
export interface RouterContext { queryClient: QueryClient }
export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: () => <ErrorScreen code="404" />,   // ErrorScreen 见 Step 4
});
```

```tsx
// src/routes/_auth.tsx —— 鉴权布局：beforeLoad 确保 me；Shell 在 Task 11 接入
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { meQuery } from '@/modules/admin/api/auth.api';
import { useAuth } from '@/stores/auth';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    if (!useAuth.getState().token)
      throw redirect({ to: '/login', search: { redirect: location.href } });
    const me = await context.queryClient.ensureQueryData(meQuery);
    return { me };   // 子路由经 context 拿 me（含 permissions）
  },
  component: () => <Outlet />,   // Task 11 换成 <Shell><Outlet/></Shell>
});
```

```tsx
// src/routes/login.tsx —— M0 极简可用版（三 Tab 像素级还原在 M1，对照原型 AUTH SCREEN 段）
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/modules/admin/api/auth.api';
import { useAuth } from '@/stores/auth';
import { router } from '@/app/mount';
import { z } from 'zod';

const searchSchema = z.object({ redirect: z.string().optional() });
export const Route = createFileRoute('/login')({ validateSearch: searchSchema, component: LoginPage });

function LoginPage() {
  const { t } = useTranslation();
  const { redirect: to } = Route.useSearch();
  const nav = useNavigate();
  const { register, handleSubmit, setError, formState } = useForm<{ username: string; password: string }>();
  const onSubmit = handleSubmit(async (dto) => {
    try {
      const { token } = await authApi.login(dto);
      useAuth.getState().setToken(token);
      await router.invalidate();          // 关键：beforeLoad 不自动重跑（spec §9）
      void nav({ to: to ?? '/admin/dashboard' });
    } catch (e) { setError('root', { message: (e as Error).message }); }
  });
  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <form onSubmit={onSubmit} className="w-[360px] rounded-lg border border-border bg-surface p-8">
        <h1 className="mb-6 text-[22px] font-semibold text-text">{t('app.name')}</h1>
        <input {...register('username')} placeholder={t('auth.username')}
          className="mb-3 h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-text" />
        <input {...register('password')} type="password" placeholder={t('auth.password')}
          className="mb-4 h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-text" />
        {formState.errors.root && <p className="mb-3 text-[12px] text-danger">{formState.errors.root.message}</p>}
        <button className="h-10 w-full rounded-md bg-pri text-white hover:bg-pri-hover">{t('auth.login')}</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: ErrorScreen（403/404 复用）+ dashboard 占位路由**

```tsx
// src/components/pro/ErrorScreen.tsx
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
export function ErrorScreen({ code }: { code: '403' | '404' }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3">
      <div className="text-[64px] font-bold text-text-3">{code}</div>
      <p className="text-text-2">{t(`errors.${code}`)}</p>
      <Link to="/admin/dashboard" className="text-pri">{t('errors.backHome')}</Link>
    </div>
  );
}
```

`common.json` 加 `"errors": { "403": "无权访问该页面", "404": "页面不存在", "backHome": "返回首页" }`（en-US 同步加 key 留空值）。

```tsx
// src/routes/_auth/admin/dashboard.tsx
import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/_auth/admin/dashboard')({
  staticData: { label: '企业概览', permission: 'dashboard:view', group: '工作台' },
  component: () => <div className="p-7 text-text">Dashboard（M1 充实）</div>,
});
```

- [ ] **Step 5: e2e 手动验收（G1）**

Run: `pnpm dev` →
1. 访问 `/admin/dashboard` → 被弹回 `/login?redirect=...`
2. `viewer/viewer123` 登录 → 回 dashboard
3. 手动清 localStorage token 刷新 → 回登录（401 链路）
4. 访问 `/xxx` → 404 屏

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: 路由装配 + 登录闭环（beforeLoad/me query/401 事件/403 404）"
```

### Task 9: 权限机制（usePermission 通配符 + AuthGuard + staticData 类型）

**Files:**
- Create: `src/lib/permission.ts`, `src/components/pro/AuthGuard.tsx`, `src/lib/route-static.d.ts`
- Test: `src/lib/__tests__/permission.test.ts`

- [ ] **Step 1: 失败测试（通配符是 review 确认的必做项，spec §7.5）**

```ts
// src/lib/__tests__/permission.test.ts
import { matchPermission } from '@/lib/permission';
test.each([
  [['*:*:*'], 'iam:user:create', true],       // RuoYi 超管
  [['iam:*'], 'iam:user:del', true],           // 段通配
  [['iam:user:view'], 'iam:user:view', true],
  [['iam:user:view'], 'iam:user:del', false],
  [[], 'iam:user:view', false],
])('%j 匹配 %s → %s', (owned, need, expected) => {
  expect(matchPermission(owned, need)).toBe(expected);
});
```

- [ ] **Step 2: 实现**

```ts
// src/lib/permission.ts
export function matchPermission(owned: string[], need: string): boolean {
  const needSeg = need.split(':');
  return owned.some((p) => {
    const seg = p.split(':');
    if (seg.includes('*')) {
      // 前缀段逐一比对，遇 * 通配其后全部
      for (let i = 0; i < needSeg.length; i++) {
        if (seg[i] === '*') return true;
        if (seg[i] !== needSeg[i]) return false;
      }
      return true;
    }
    return p === need;
  });
}
```

```tsx
// src/components/pro/AuthGuard.tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { meQuery } from '@/modules/admin/api/auth.api';
import { matchPermission } from '@/lib/permission';
import type { ReactNode } from 'react';

export function usePermission() {
  const { data } = useSuspenseQuery(meQuery);
  return (need: string) => matchPermission(data.permissions, need);
}
export function AuthGuard({ permission, children, fallback = null }:
  { permission: string; children: ReactNode; fallback?: ReactNode }) {
  const can = usePermission();
  return can(permission) ? children : fallback;
}
```

```ts
// src/lib/route-static.d.ts —— staticData 类型（spec §7.4：路由文件是权限元数据单一真相）
import '@tanstack/react-router';
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    label?: string;                                   // 面包屑兜底
    permission?: string;                              // 页面 view 权限符
    actions?: { code: string; label: string }[];      // 按钮级权限点（角色配置页聚合用）
    group?: string;                                   // 权限配置页"模块"分组
  }
}
```

- [ ] **Step 3: _auth beforeLoad 加页面级校验**

`src/routes/_auth.tsx` 的 beforeLoad 在 ensureQueryData 之后追加：

```ts
    const staticData = matches[matches.length - 1]?.staticData;   // beforeLoad 参数解构出 matches
    const need = staticData?.permission;
    if (need && !matchPermission(me.permissions, need))
      throw redirect({ to: '/403' });   // 只 throw，禁止 toast 副作用（preload='intent' 下 hover 即触发）
```

同时创建 `src/routes/403.tsx`（复用 ErrorScreen，放 _auth 外层可独立访问）。

- [ ] **Step 4: 验收 + Commit**

Run: `pnpm test permission` → 5 passed；dev 下 viewer 账号直达 `/admin/dashboard`（有 dashboard:view）正常，构造无权限路由验证 403。

```bash
git add -A && git commit -m "feat: 权限机制（通配符匹配/AuthGuard/staticData 声明/页面级守卫）"
```

### Task 10: 子系统 registry + 菜单数据流（manifest 种子 → mock API → Query）

**Files:**
- Create: `src/modules/types.ts`, `src/modules/registry.ts`, `src/modules/admin/manifest.ts`, `src/modules/admin/mocks/menu.handlers.ts`, `src/modules/admin/api/menu.api.ts`, `src/lib/menu-tree.ts`
- Modify: `src/mocks/browser.ts`（挂 handlers）
- Test: `src/lib/__tests__/menu-tree.test.ts`

- [ ] **Step 1: 类型与 manifest（spec §7.1 数据模型）**

```ts
// src/modules/types.ts
import type { LocalizedString } from '@/lib/localized';
import type { FileRouteTypes } from '@/routeTree.gen';
export type RoutePath = FileRouteTypes['to'];        // ★ 编译期收窄：种子路径 typo = 编译错误

export interface Subsystem {
  key: string; label: LocalizedString; desc: LocalizedString;
  icon: string; color: string; home: RoutePath;
  builtin: boolean; enabled: boolean; sort: number;
}
export interface MenuRecord {
  id: string; parentId: string | null; subsystemKey: string;
  type: 'dir' | 'menu' | 'action';
  label: LocalizedString; icon?: string; shortLabel?: LocalizedString;
  path?: RoutePath; permission?: string; visible: boolean; sort: number;
}
export interface SubsystemManifest { subsystem: Subsystem; menuSeed: MenuRecord[] }
```

```ts
// src/modules/admin/manifest.ts —— M0 种子只含已有路由（dashboard + 成员与部门），
// M1 每加一页在此补种子行；权限符用原型业务域风格（spec §7.5）
import type { SubsystemManifest } from '@/modules/types';

export const adminManifest: SubsystemManifest = {
  subsystem: {
    key: 'admin', label: { 'zh-CN': '后台管理', 'en-US': 'Admin' },
    desc: { 'zh-CN': '组织 · 权限 · 审计', 'en-US': 'Org · IAM · Audit' },
    icon: 'layout-grid', color: '#3370ff', home: '/admin/dashboard',
    builtin: true, enabled: true, sort: 1,
  },
  menuSeed: [
    { id: 'm-home', parentId: null, subsystemKey: 'admin', type: 'dir',
      label: { 'zh-CN': '工作台' }, shortLabel: { 'zh-CN': '工作台' }, icon: 'layout-dashboard', visible: true, sort: 1 },
    { id: 'm-dashboard', parentId: 'm-home', subsystemKey: 'admin', type: 'menu',
      label: { 'zh-CN': '企业概览' }, path: '/admin/dashboard', permission: 'dashboard:view', visible: true, sort: 1 },
    { id: 'm-org', parentId: null, subsystemKey: 'admin', type: 'dir',
      label: { 'zh-CN': '组织与权限' }, shortLabel: { 'zh-CN': '组织' }, icon: 'users', visible: true, sort: 2 },
    { id: 'm-users', parentId: 'm-org', subsystemKey: 'admin', type: 'menu',
      label: { 'zh-CN': '成员与部门' }, path: '/admin/users', permission: 'iam:user:view', visible: true, sort: 1 },
  ],
};
```

```ts
// src/modules/registry.ts —— ★ 子系统唯一聚合点（spec §7.6 增删清单的注册步骤）
import { adminManifest } from '@/modules/admin/manifest';
export const manifests = [adminManifest];
```

- [ ] **Step 2: menu-tree 纯函数（TDD）**

```ts
// src/lib/__tests__/menu-tree.test.ts
import { buildMenuTree } from '@/lib/menu-tree';
import { adminManifest } from '@/modules/admin/manifest';

test('组树 + 权限过滤 + action 不渲染', () => {
  const tree = buildMenuTree(adminManifest.menuSeed, ['dashboard:view']);
  expect(tree).toHaveLength(1);                       // 只剩"工作台"组（org 组无权限被剪空）
  expect(tree[0]!.children![0]!.path).toBe('/admin/dashboard');
});
test('通配符全量可见', () => {
  expect(buildMenuTree(adminManifest.menuSeed, ['*:*:*'])).toHaveLength(2);
});
```

```ts
// src/lib/menu-tree.ts
import type { MenuRecord } from '@/modules/types';
import { matchPermission } from '@/lib/permission';

export interface MenuNode extends MenuRecord { children?: MenuNode[] }
export function buildMenuTree(records: MenuRecord[], permissions: string[]): MenuNode[] {
  const visible = records.filter((r) => r.type !== 'action' && r.visible
    && (!r.permission || matchPermission(permissions, r.permission)));
  const byParent = new Map<string | null, MenuNode[]>();
  for (const r of [...visible].sort((a, b) => a.sort - b.sort)) {
    const list = byParent.get(r.parentId) ?? [];
    list.push({ ...r }); byParent.set(r.parentId, list);
  }
  const attach = (n: MenuNode): MenuNode => ({ ...n, children: (byParent.get(n.id) ?? []).map(attach) });
  return (byParent.get(null) ?? []).map(attach)
    .filter((n) => n.type === 'menu' || (n.children && n.children.length > 0));  // 剪空目录
}
```

- [ ] **Step 3: mock handlers + API 模块 + Query（Shell 只吃 API，不 import manifest——spec §6 数据流同构）**

> 来自 Task 5 review 的待办：① handler 用共享 helper `import { ok, biz } from '@/mocks/http'`（勿重新声明）；② 新 handlers 追加进 `src/mocks/handlers.ts` 的 allHandlers 聚合；③ 本 task 是 db 的第二个域——落地 collection helper 模式（id 生成 + CRUD + resetDb()），后续 18 个域照此模板，别让每个域手写 find/set 样板。

```ts
// src/modules/admin/mocks/menu.handlers.ts
import { http } from 'msw';
import { ok } from '@/mocks/http';
import { manifests } from '@/modules/registry';
// 种子灌入内存表（浅拷贝，支持后续 CRUD）
const subsystems = manifests.map((m) => ({ ...m.subsystem }));
const menus = manifests.flatMap((m) => m.menuSeed.map((r) => ({ ...r })));
export const menuHandlers = [
  http.get('/api/subsystems', () => ok(subsystems)),
  http.get('/api/menus', ({ request }) => {
    const sub = new URL(request.url).searchParams.get('subsystem');
    return ok(menus.filter((m) => !sub || m.subsystemKey === sub));
  }),
];
```

```ts
// src/modules/admin/api/menu.api.ts
import { http } from '@/lib/http/client';
import { queryOptions } from '@tanstack/react-query';
import type { MenuRecord, Subsystem } from '@/modules/types';

export const subsystemsQuery = queryOptions({
  queryKey: ['nav', 'subsystems'], staleTime: Infinity,
  queryFn: () => http.get<Subsystem[]>('/api/subsystems'),
});
export const menusQuery = (subsystem: string) => queryOptions({
  queryKey: ['nav', 'menus', subsystem], staleTime: Infinity,
  queryFn: () => http.get<MenuRecord[]>('/api/menus', { subsystem }),
});
```

`src/mocks/browser.ts` 的 setupWorker 改为 `setupWorker(...authHandlers, ...menuHandlers)`。

- [ ] **Step 4: dev 校验（菜单路径 ⊆ 路由树，spec §7.4）**

```ts
// ⚠️ 执行修正（批次 A 实测）：漂移校验不能放 registry.ts 的 import 期——
// routeTree 的 fullPath 在 createRouter() 之前未计算，import 期校验会全量误报。
// 实际落位：app/mount.tsx 的 createRouter 之后调用 assertMenuPathsValid()（DEV only）。
// 校验函数本体放 registry.ts 导出，mount 只负责在正确时机调用。
export function assertMenuPathsValid(router: AnyRouter): void {
  if (!import.meta.env.DEV) return;
  const valid = new Set(Object.keys(router.routesByPath));
  for (const m of manifests) for (const rec of m.menuSeed)
    if (rec.path && !valid.has(rec.path)) console.error(`[menu-drift] 菜单 ${rec.id} 指向不存在路由: ${rec.path}`);
}
```

- [ ] **Step 5: 验收 + Commit**

Run: `pnpm test` 全绿；`pnpm typecheck`（故意把种子 path 改成 `/admin/xxx` 验证编译报错后改回）。

```bash
git add -A && git commit -m "feat: 子系统 registry + 菜单数据流（种子→mock API→Query + 编译期路径收窄 + dev 漂移校验）"
```

---

## Phase 3：App Shell（Task 11-14）

> Shell 各件的**像素细节以原型为准**：每个 step 标注了原型定位方式（行号或 grep 关键词）。plan 给出的代码是结构与数据流完整版，执行时对照原型微调间距/字号/阴影。**这不是占位符**——原型在仓库内，是比转抄进 plan 更可靠的权威源。

### Task 11: shadcn 基座 + Shell 容器 + 部件第一批

**Files:**
- Create: `components.json`（shadcn init）, `src/components/ui/*`（button/input/dropdown-menu/dialog/sheet/popover/switch/tooltip/avatar）, `src/app/shell/Shell.tsx`, `src/app/shell/widgets/{SubsystemSwitcher,NavMenuSidebar,UserMenu,GlobalSearch,DarkModeToggle,NotificationBell,LanguageMenu,Breadcrumb,HeaderActions}.tsx`, `src/lib/icon-registry.ts`

> 范围注记：spec §15 将 `I18nInput` 列在 M0，但其首个消费者（菜单/子系统编辑器）在 M1——组件跟随消费者，挪 M1 实现，避免凭空实现无处验收。`lv()` 数据侧基建仍在 M0（Task 6）。

- [ ] **Step 1: shadcn init + 基础组件**

```bash
pnpm dlx shadcn@latest init   # style: new-york, css vars: yes, 指向 src/styles/global.css
pnpm dlx shadcn@latest add button input dropdown-menu dialog sheet popover switch tooltip avatar
```

init 后检查 global.css：shadcn 会注入自己的变量块——把 `--background/--card/--popover` 等 alias 到我们的语义 token（`--background: var(--bg)` 等，映射表照 spec §8.1），删除其硬编码色值。`components/ui/**` 在 ESLint ignores 中（Task 3 已配）。

- [ ] **Step 2: icon-registry**

```ts
// src/lib/icon-registry.ts —— DB 存字符串，前端映射组件（spec §6）
import { LayoutGrid, LayoutDashboard, Users, Shield, FolderOpen, Settings2, Truck, Link2,
  DollarSign, Handshake, BarChart3, ClipboardList, Bell, Search, Moon, Sun, Globe, type LucideIcon } from 'lucide-react';
const registry: Record<string, LucideIcon> = {
  'layout-grid': LayoutGrid, 'layout-dashboard': LayoutDashboard, users: Users, shield: Shield,
  'folder-open': FolderOpen, settings: Settings2, truck: Truck, link: Link2, dollar: DollarSign,
  handshake: Handshake, chart: BarChart3, clipboard: ClipboardList, bell: Bell, search: Search,
  moon: Moon, sun: Sun, globe: Globe,
};
export const getIcon = (key: string | undefined): LucideIcon => registry[key ?? ''] ?? LayoutGrid;
```

- [ ] **Step 3: Shell 容器（统一取数，布局 props 下发——spec §7.3 数据流）**

```tsx
// src/app/shell/Shell.tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import { useLocation } from '@tanstack/react-router';
import { subsystemsQuery, menusQuery } from '@/modules/admin/api/menu.api';
import { meQuery } from '@/modules/admin/api/auth.api';
import { buildMenuTree } from '@/lib/menu-tree';
import { useAppearance } from '@/stores/appearance';
import { layoutRegistry } from './layouts/registry';

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const subsystemKey = pathname.split('/')[1] || 'admin';   // URL 第一段 = 子系统 key（spec §4）
  const { data: subsystems } = useSuspenseQuery(subsystemsQuery);
  const { data: menus } = useSuspenseQuery(menusQuery(subsystemKey));
  const { data: me } = useSuspenseQuery(meQuery);
  const menuTree = useMemo(() => buildMenuTree(menus, me.permissions), [menus, me.permissions]);
  const layout = useAppearance((s) => s.layout);
  const collapsed = useAppearance((s) => s.collapsed[layout] ?? false);
  const toggleCollapsed = useAppearance((s) => s.toggleCollapsed);
  const Layout = layoutRegistry[layout] ?? layoutRegistry.sidebar;
  return (
    <Layout menuTree={menuTree} subsystems={subsystems} collapsed={collapsed}
      onCollapsedChange={() => toggleCollapsed(layout)}>{children}</Layout>
  );
}
```

- [ ] **Step 4: 部件第一批（结构完整，像素对照原型）**

各部件要点（每个一个文件，均消费 props 或 store，不感知布局）：

- `SubsystemSwitcher`：Popover 弹层列出 `subsystems`（enabled=false 显示"即将上线"徽标、不可点）；卡片含色块 icon + `lv(label)` + `lv(desc)`；点击 `navigate({ to: sub.home })`。**弹层规格 props 化**（`variant: 'brand' | 'header'`——320px 锚定侧栏 / 500px 锚定 header，原型 L185 与 L266）
- `NavMenuSidebar`：两级树。dir 行可折叠，子级展开用 grid `grid-rows-[0fr]↔[1fr]` + `transition-[grid-template-rows] duration-[260ms]`（原型 README"grid 0fr↔1fr .26s"）；激活项 `bg-pri-soft text-pri`；menu 行 `<Link to={node.path}>`
- `UserMenu`：DropdownMenu：个人中心（M1 路由）、5 个 stub 项（toast）、退出登录（`authApi.logout()` → 清 token → `router.invalidate()` → `/login`）
- `GlobalSearch`：440px 输入框居中（原型 L298-300），M0 仅 UI + toast
- `DarkModeToggle`：`useAppearance` 切 mode（与外观抽屉同源）
- `NotificationBell`：红点徽标（M0 写死 3），点击 toast（消息中心 M1）
- `LanguageMenu`：切 `i18n.changeLanguage` + localStorage `locale`
- `Breadcrumb`：`useMatches()` 取匹配链的 `staticData.label`，菜单树命中则用菜单 `lv(label)`（详情页兜底 staticData——spec §8.3）

toast 用 `sonner`：`pnpm add sonner`，Toaster 挂 providers。

- [ ] **Step 5: 验证渲染（Storybook 不引入，直接 dev 页面挂载检查）+ Commit**

```bash
git add -A && git commit -m "feat: shadcn 基座 + Shell 容器 + 导航部件第一批"
```

### Task 12: SidebarLayout + Header（毛玻璃）+ 接入 _auth

**Files:**
- Create: `src/app/shell/layouts/{types.ts,SidebarLayout.tsx,registry.ts}`, `src/app/shell/widgets/ShellHeader.tsx`
- Modify: `src/routes/_auth.tsx`（component 换 Shell）

- [ ] **Step 1: 布局契约（spec §8.2 修正版）**

```ts
// src/app/shell/layouts/types.ts
import type { ReactNode } from 'react';
import type { MenuNode } from '@/lib/menu-tree';
import type { Subsystem } from '@/modules/types';
export interface ShellLayoutProps {
  menuTree: MenuNode[]; subsystems: Subsystem[];
  collapsed: boolean; onCollapsedChange: (v: boolean) => void;
  children: ReactNode;
}
```

- [ ] **Step 2: ShellHeader（可组合件，布局决定往里放什么——位置知识归布局）**

```tsx
// src/app/shell/widgets/ShellHeader.tsx —— 毛玻璃行为自含（原型 L4816-4820）
import { useEffect, useState, type ReactNode } from 'react';
export function ShellHeader({ left, right, transparentUntilScroll = false }:
  { left?: ReactNode; right: ReactNode; transparentUntilScroll?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const main = document.getElementById('shell-main');
    const on = () => setScrolled((main?.scrollTop ?? 0) > 8);
    main?.addEventListener('scroll', on); return () => main?.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`absolute inset-x-0 top-0 z-20 flex h-14 items-center gap-[18px] px-5 transition-all
      ${scrolled
        ? 'border-b border-border shadow-[0_1px_12px_rgba(0,0,0,.06)] backdrop-blur-[14px] backdrop-saturate-[1.6] bg-[var(--surface-blur)]'
        : transparentUntilScroll ? 'border-b border-border bg-transparent' : 'border-b border-border bg-chrome'}`}>
      {left}<div className="ml-auto flex items-center gap-1">{right}</div>
    </header>
  );
}
```

- [ ] **Step 3: SidebarLayout（飞书经典：Header 通栏在上，下方侧栏 + 内容）**

```tsx
// src/app/shell/layouts/SidebarLayout.tsx —— 结构照原型 rootStyle 列向分支（L4810-4824）
import type { ShellLayoutProps } from './types';
import { SubsystemSwitcher } from '../widgets/SubsystemSwitcher';
import { NavMenuSidebar } from '../widgets/NavMenuSidebar';
import { ShellHeader } from '../widgets/ShellHeader';
import { GlobalSearch } from '../widgets/GlobalSearch';
import { HeaderActions } from '../widgets/HeaderActions';   // 铃铛+暗色+语言+外观+头像 的组合小件

export function SidebarLayout({ menuTree, subsystems, collapsed, onCollapsedChange, children }: ShellLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-bg text-text">
      <ShellHeader left={<><SubsystemSwitcher subsystems={subsystems} variant="header" /><GlobalSearch /></>}
        right={<HeaderActions />} />
      <div className="flex min-h-0 flex-1 pt-14">
        <aside className={`${collapsed ? 'w-16' : 'w-[248px]'} shrink-0 border-r border-border bg-chrome transition-[width] duration-200`}>
          <NavMenuSidebar tree={menuTree} collapsed={collapsed} onToggle={onCollapsedChange} />
        </aside>
        <main id="shell-main" className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
```

```ts
// src/app/shell/layouts/registry.ts
import type { ComponentType } from 'react';
import type { ShellLayoutProps } from './types';
import { SidebarLayout } from './SidebarLayout';
export const layoutRegistry: Record<string, ComponentType<ShellLayoutProps>> = {
  sidebar: SidebarLayout,   // rail/inset Task 13 注册
};
```

- [ ] **Step 4: _auth 接入 Shell**

`src/routes/_auth.tsx` component 改为：

```tsx
component: () => <Shell><Outlet /></Shell>,
```

- [ ] **Step 5: e2e 验收（G1）+ Commit**

`pnpm dev`：登录后见完整 Shell（侧栏菜单来自 mock API、切换器弹层、Header 滚动毛玻璃、viewer 账号看不到无权限菜单）。对照原型 sidebar 布局微调间距/字号。

```bash
git add -A && git commit -m "feat: SidebarLayout + Header 毛玻璃 + Shell 接入鉴权布局"
```

### Task 13: RailLayout + InsetLayout

**Files:**
- Create: `src/app/shell/layouts/RailLayout.tsx`, `src/app/shell/layouts/InsetLayout.tsx`, `src/app/shell/widgets/NavMenuRail.tsx`, `src/app/shell/widgets/NavMenuInset.tsx`
- Modify: `src/app/shell/layouts/registry.ts`

- [ ] **Step 1: RailLayout**（原型定位：grep `layout==='rail'`）：左侧两栏通顶——64px 图标 rail（dir 的 icon + `lv(shortLabel)`）+ 224px 二级面板（当前 dir 的 menu 平铺）；Header 在右侧列内。切换器 `variant="brand"` 放 rail 顶部。

- [ ] **Step 2: InsetLayout**（原型定位：grep `layout==='inset'` 与 `shellStyle`，L4813-4814）：整屏 `bg-canvas` 行向布局；侧栏通顶（含切换器 `variant="brand"` 于顶部、NavMenuInset 平铺分组、底部折叠开关）；内容区是浮起白卡 `m-2 ml-0 rounded-xl border shadow`，Header 嵌卡内 `transparentUntilScroll`。

- [ ] **Step 3: 注册 + 手动切换验收**

registry 补 `rail: RailLayout, inset: InsetLayout`。dev 中改 localStorage appearance.layout 分别验证三布局；per-layout collapsed 互不影响（Task 7 已建）。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: Rail/Inset 布局（布局自组部件，注册制）"
```

### Task 14: 外观设置抽屉 + 切页动画

> 来自 Task 2 review 的待办：① `ACCENTS` 缺 `label` 字段（'经典蓝' 等，原型 L4779-4782），本 task 补上并迁移相关类型；② 自定义取色输入需校验 hex 格式（非法输入会让 hexToSoft 产出 rgba(NaN,…)）；③ 决策项：非默认 accent 首帧闪蓝（FOUC 脚本不注入 --pri）——可选修复是 store 持久化已解析的 pri/soft 字符串供 FOUC 脚本直接 setProperty，按成本收益当场定。

**Files:**
- Create: `src/app/shell/widgets/AppearanceDrawer.tsx`, `src/components/pro/PageTransition.tsx`
- Modify: `src/app/shell/widgets/HeaderActions.tsx`（调色板图标开抽屉）

- [ ] **Step 1: AppearanceDrawer**（原型定位：grep `外观` / `flavor` 选项区，约 L4940-5000）：Sheet 右滑入。分区：界面风格（feishu/claude 卡片，调 `setFlavor`——自动重置主题色）、主题色（4 预设圆点 + 自定义 `<input type="color">` 调 `set({accent:'custom', customAccent})`）、导航布局（三缩略图）、页面动画（5 选）、显示比例（sm/md/lg 分段）、圆角（三档）。全部即时生效（store.set → applyAppearance）。

- [ ] **Step 2: PageTransition**

```tsx
// src/components/pro/PageTransition.tsx —— keyframes 已在 global.css（Task 2）
import { useLocation } from '@tanstack/react-router';
import { useAppearance } from '@/stores/appearance';
import type { ReactNode } from 'react';
const animClass = { none: '', fade: 'animate-[pg-fade_.25s]', slide: 'animate-[pg-slide_.25s]',
  up: 'animate-[pg-up_.25s]', scale: 'animate-[pg-scale_.25s]' } as const;
export function PageTransition({ children }: { children: ReactNode }) {
  const anim = useAppearance((s) => s.pageAnim);
  const { pathname } = useLocation();
  return <div key={pathname} className={animClass[anim]}>{children}</div>;
}
```

各布局的 `<main>` 内包 `<PageTransition>`。

- [ ] **Step 3: 全维度手动验收（pairwise 抽查 8 组合）+ Commit**

flavor×mode×accent×radius×zoom×layout 手动抽 8 个代表组合核对（暗色 claude + 陶土橙 + inset 必查——耦合规则重灾区）。

```bash
git add -A && git commit -m "feat: 外观抽屉全项 + 五种切页动画"
```

---

## Phase 4：DataTable 与垂直切片（Task 15-16）

### Task 15: DataTable v1

**Files:**
- Create: `src/components/pro/DataTable.tsx`, `src/components/pro/data-table/{Toolbar.tsx,Pagination.tsx,types.ts}`
- Test: `src/components/pro/__tests__/DataTable.test.tsx`

- [ ] **Step 1: 失败测试（渲染 + 受控分页回调）**

```tsx
// src/components/pro/__tests__/DataTable.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '@/components/pro/DataTable';

const columns = [{ accessorKey: 'name', header: '姓名' }];
const data = [{ id: '1', name: '张三' }];
test('渲染表头与行', () => {
  render(<DataTable columns={columns} data={data} rowCount={1}
    pagination={{ page: 1, pageSize: 10 }} onPaginationChange={() => {}} />);
  expect(screen.getByText('姓名')).toBeInTheDocument();
  expect(screen.getByText('张三')).toBeInTheDocument();
});
test('翻页回调（受控，状态归页面 search params）', () => {
  const onChange = vi.fn();
  render(<DataTable columns={columns} data={data} rowCount={25}
    pagination={{ page: 1, pageSize: 10 }} onPaginationChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  expect(onChange).toHaveBeenCalledWith({ page: 2, pageSize: 10 });
});
```

- [ ] **Step 2: 实现（TanStack Table headless + 原型 std* 规格）**

核心 props（`types.ts`）：

```ts
export interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[]; data: T[]; rowCount: number;
  pagination: { page: number; pageSize: number };
  onPaginationChange: (p: { page: number; pageSize: number }) => void;
  loading?: boolean; error?: string;
  toolbar?: { search?: { value: string; onChange: (v: string) => void; placeholder?: string };
    tabs?: { value: string; options: { value: string; label: string; count?: number }[]; onChange: (v: string) => void };
    primary?: ReactNode };                       // 主按钮由页面传入（挂权限符）
  rowSelection?: { selected: Record<string, boolean>; onChange: (s: Record<string, boolean>) => void };
}
```

视觉规格（照原型 std* 体系，README §标准表格体系）：面板 `rounded-lg border border-border overflow-hidden bg-surface`；表头行 `h-11 bg-surface-2 text-[13px] text-text-3 sticky top-0`；数据行 `h-14 border-t border-border hover:bg-surface-2 data-[selected]:bg-pri-soft`；分页右下、当前页 `bg-pri text-white`；loading = 骨架行 ×5；空态 = 居中图标 + `t('table.empty')`；error 态 = 居中文案 + 重试钮。

- [ ] **Step 3: 测试通过 → Commit**

```bash
git add -A && git commit -m "feat: DataTable v1（std 规格/受控分页/工具栏/三态/行选择）"
```

### Task 16: 垂直切片——成员与部门页（逼出全部 pro 组件）

**Files:**
- Create: `src/routes/_auth/admin/users.tsx`, `src/modules/admin/api/user.api.ts`, `src/modules/admin/mocks/user.handlers.ts`（含 dept/user 两域 faker 种子）, `src/components/pro/{PageHeader,DetailDrawer,ConfirmDialog,IndentSelect,StatusBadge}.tsx`
- Modify: `src/mocks/browser.ts`, `src/locales/zh-CN/admin.json`

- [ ] **Step 1: mock 域（部门树 8 个 + 成员 45 个，faker 固定 seed 保证可复现）**

```ts
// src/modules/admin/mocks/user.handlers.ts 数据形状
export interface DeptDto { id: string; parentId: string | null; name: string; sort: number }
export interface UserDto { id: string; name: string; deptId: string; role: string; phone: string;
  email: string; status: 'active' | 'disabled' | 'resigned'; joinedAt: string }
// handlers：GET /api/depts（全量树）；GET /api/users（page/pageSize/deptId/status/keyword 过滤+分页）；
// POST/PUT/DELETE /api/users/:id（内存真实生效）；POST /api/users/batch-disable
faker.seed(42);
```

- [ ] **Step 2: API 模块 + queryOptions**（`user.api.ts`：`deptsQuery` / `usersQuery(params)` key `['iam','users',params]`；变更 mutation 后 `invalidateQueries({ queryKey: ['iam','users'] })` 前缀失效）

- [ ] **Step 3: 页面（typed search params 是本页核心示范——spec §9/§10）**

```tsx
// src/routes/_auth/admin/users.tsx 关键骨架
const searchSchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.number().int().catch(10),
  status: z.enum(['all', 'active', 'disabled', 'resigned']).catch('all'),
  deptId: z.string().optional(),
  keyword: z.string().catch(''),
});
export const Route = createFileRoute('/_auth/admin/users')({
  validateSearch: searchSchema,
  staticData: {
    label: '成员与部门', permission: 'iam:user:view', group: '组织与权限',
    actions: [
      { code: 'iam:user:create', label: '新建成员' }, { code: 'iam:user:update', label: '编辑成员' },
      { code: 'iam:user:del', label: '删除成员' }, { code: 'iam:user:resign', label: '办理离职' },
      { code: 'iam:dept:create', label: '新建部门' },   // 一页多资源示范（spec §7.5）
    ],
  },
  component: UsersPage,
});
// 页面布局：左 240px 部门树（缩进列表，非拖拽树——原型 L596-608）+ 右 DataTable
// 筛选/分页全部读写 Route.useSearch() / navigate({ search })——刷新不丢、可分享
// 行内"详情"开 DetailDrawer；"新建成员"按钮包 <AuthGuard permission="iam:user:create">
// 批量选择出现底部操作条（批量禁用）；删除走 ConfirmDialog
```

- [ ] **Step 4: e2e 验收（G1，本 task 是 M0 的总集成验收）**

1. viewer 登录：能看列表，"新建成员"按钮不渲染（AuthGuard）
2. admin 登录：新建成员 → 表格出现（mock 真实写入）；筛选"离职" + 翻页 → 刷新浏览器状态不丢（URL 化）；复制 URL 新标签打开 → 同视图
3. 删除 → ConfirmDialog → 行消失
4. 三布局 × 明暗下该页视觉正常

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: 成员与部门垂直切片（typed search params/AuthGuard/抽屉/批量/mock CRUD）"
```

---

## Phase 5：验收工具链与工程收尾（Task 17-18）

### Task 17: 视觉回归脚手架 + 原型基准截图 + Safari zoom 实测

**Files:**
- Create: `e2e/visual.spec.ts`, `scripts/capture-prototype.ts`, `playwright.config.ts`

- [ ] **Step 1: 原型基准截图脚本**：Playwright 打开 `后台管理脚手架.dc.html`（file://），用 `page.evaluate` 驱动原型 state（原型 Component 实例可通过其 DC runtime 访问；不行则模拟点击导航），截 `dashboard / users / login` 三屏 × sidebar 布局 × feishu 亮色 → `e2e/baseline/`。viewport 1440×900 固定。

- [ ] **Step 2: 视觉回归 spec**：实现侧同 viewport 截同三屏，`expect(screenshot).toMatchSnapshot({ maxDiffPixelRatio: 0.02 })` 对 baseline。M0 允许 diff 超阈值（页面还没像素级打磨），**产出 diff 报告作为 M1 打磨清单**——本 task 交付的是工具链不是达标。

- [ ] **Step 3: Safari zoom 实测（spec §8.1 遗留验证项）**：`playwright webkit` 下三档 zoom 分别打开 users 页，验证 DropdownMenu/Popover/Sheet 弹层定位不偏移。结果记录进 `docs/superpowers/specs/` 的设计文档"决策记录"处（若 webkit 有偏移：记录现象 + 降级方案 = Safari UA 下隐藏 zoom 选项）。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: 视觉回归工具链 + 原型基准截图 + Safari zoom 实测记录"
```

### Task 18: CI + 模板 CLAUDE.md + README + CHANGELOG

**Files:**
- Create: `.github/workflows/ci.yml`, `CLAUDE.md`, `CHANGELOG.md`
- Modify: `README.md`（追加"工程使用"章节，原交接稿内容保留在后半）

- [ ] **Step 1: CI**

```yaml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck && pnpm test
      - run: pnpm build
      - name: mock 剥离验收（spec §13.5）
        run: "! grep -r 'faker' dist/assets/"
```

- [ ] **Step 2: CLAUDE.md（内容清单照 spec §14）**：token 铁律（只用语义 token/禁 hex/禁任意圆角）、状态边界（服务端数据归 Query）、query key 约定、子系统新增 7 步/删除 4 步（照 spec §7.6 抄录）、admin 内核页标注、权限双模式、i18n 剥离立场、前端权限非安全边界、mock 剥离验收、宽度用 px 纪律。

- [ ] **Step 3: CHANGELOG.md 起版 `0.1.0 (M0)`；package.json version 同步。**

- [ ] **Step 4: 全量回归 + Commit + tag**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿。

```bash
git add -A && git commit -m "chore: CI + 模板 CLAUDE.md + CHANGELOG（M0 收官）"
git tag m0-done
```

---

## M0 完成定义（DoD）

- [ ] 登录（多角色）→ Shell（三布局可切、外观五维可调、耦合规则正确）→ 成员与部门页全交互，e2e 手工流全通过
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 全绿；生产包无 faker
- [ ] token 快照测试拦截任何 token 漂移；视觉回归工具链可产 diff 报告
- [ ] Safari zoom 实测结论记录在案
- [ ] viewer 账号全程无越权入口（菜单/页面/按钮三级）

## 后续（不在本 plan）

M1 量产期（admin 余页 + lastmile 全页 + 登录三 Tab 像素版 + SVG 图表 + 菜单编辑器）与 M2 收尾期（i18n 词条全量 + 打印 + 视觉全矩阵 + 三演练）在 M0 验收后另立 plan——届时以 M0 实际产出的组件 API 为准写任务，避免现在凭空预写与实现漂移。
