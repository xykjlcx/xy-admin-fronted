# Electron 双宿主验收报告

> 日期：2026-07-11  
> 分支：`codex/electron-dual-host`  
> 状态：实施中；本报告只登记已执行证据，未完成项保持 `pending`。

## §20.1 对照表

| #   | 完成条件                                           | 当前状态 | 证据指针                                                         |
| --- | -------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| 1   | Packaged Spike                                     | 通过     | `pnpm test:desktop`；`e2e/electron/packaged-spike.spec.ts`       |
| 2   | 同一 `src/` 双构建、业务无 Electron 依赖、共享配置 | 通过     | `vite.renderer.config.ts`；`pnpm guard:desktop`；双构建产物守卫  |
| 3   | Web 登录、路由、主题、Mock 与既有测试零退化        | 阶段通过 | `vitest` 666 项、`theme:guard` 196 项、`build:web` 与产物扫描    |
| 4   | 两种窗口模式与三套 Shell 安全区                    | pending  | Phase 4                                                          |
| 5   | Electron 凭证安全存储与统一会话服务                | pending  | Phase 3                                                          |
| 6   | 原生文件下载闭环                                   | pending  | Phase 5                                                          |
| 7   | 更新状态机、feed、metadata 与真实更新              | pending  | Phase 6–7；真实签名更新需满足签名前提                            |
| 8   | CSP、sandbox、隔离、fuses、导航、sender、schema    | 实施中   | Phase 0 已验证 CSP/窗口隔离/导航；IPC 与 release fuse 待后续阶段 |
| 9   | 全部门禁、visual、Electron E2E、平台 smoke         | 实施中   | Phase 0 自动化与 macOS arm64 未签名 packaged smoke 已登记        |
| 10  | 四份文档与代码一致                                 | pending  | Phase 8                                                          |
| 11  | 既有改动未覆盖、提交可独立回滚                     | 通过     | 独立 worktree；提交 `a2bc250`                                    |

## 分期证据

### Phase 0 — Packaged Spike

- `pnpm test:desktop`
  - Desktop Vitest：8 个文件、40 项通过。
  - 自动生成 1 日有效 localhost 自签证书到 gitignore 的 `test-results/`；证书未提交。
  - `electron-vite build`：Main、单文件 CJS Preload、相对 base Renderer 构建通过。
  - `electron-builder --mac --arm64 --dir`：生成未签名 packaged `.app`。
  - Playwright：1 项 packaged E2E 通过，耗时 2.9 秒。
- Packaged E2E 实测：
  - URL 为 `app://renderer/index.html#/login`，未使用 `file://`。
  - favicon、CSS、动态 JS 均从 `app://renderer` 成功加载；hash 路由刷新、后退、前进恢复正常。
  - Preload 返回 `{ runtime: desktop, platform: darwin, chrome: native }`；Renderer 中 `process`、`require` 均为 `undefined`。
  - 文档响应 CSP 含 `default-src 'self'`、`script-src 'self'`，无 script `unsafe-inline/unsafe-eval`；内联脚本探针被拒绝。
  - 麦克风权限、新窗口和未授权 HTTPS 导航被拒绝。
  - 真实 HTTPS 测试服务收到 `Origin: app://renderer`；登录 POST 与 Authorization GET 均完成精确 CORS 预检。
  - `/api/auth/login` 与 `/api/auth/me` 通过现有 HTTP/Zod contract；受保护请求返回 401 后跳转为内部 `/login?redirect=/admin/dashboard`，未混入宿主资源路径。
- Web 阶段门禁：
  - `./node_modules/.bin/tsc -b --noEmit`：通过。
  - `./node_modules/.bin/eslint src`：0 error，保留既有 TanStack Table React Compiler warning 1 条。
  - `./node_modules/.bin/vitest run`：112 个文件、663 项通过。
  - `pnpm theme:guard`：4 个文件、196 项通过。
  - `pnpm design:lint`：0 error；40 个既有白名单 warning。
  - `pnpm build:web`：通过；`dist` 1,620 KiB，最大 JS chunk 264,517 bytes，入口 chunk 127,570 bytes。
  - `rg` 产物扫描：Web 包无 `faker`、`mockServiceWorker`、`setupWorker`、Electron API、Node `fs`；通过。

### Phase 1 — 宿主骨架

- 提交：`01a072c`。
- `pnpm dev:desktop -- --window-chrome=native`：
  - Main 6 modules、Preload 83 modules 编译通过。
  - Renderer dev server 在 `http://localhost:5173/` 监听；本地 Electron 主进程与启用 `--enable-sandbox` 的 Renderer 进程实际启动。
  - 验证后通过 Ctrl-C 主动结束开发进程；无遗留 Electron、electron-vite 或 Spike server 进程。
- `pnpm guard:desktop`：通过。守卫自动拒绝 `src/**` 的 Electron/Node import、裸 `window.desktop`，以及 `electron/**` 的业务/React import、散落 `process.env` 和非 Preload `ipcRenderer`。
- `pnpm build:web`：通过；自动产物守卫回读 `totalBytes=1,411,208`、`largestJavaScriptBytes=264,517`、`fileCount=91`。
- `pnpm build:desktop -- --window-chrome=native`：通过；自动产物守卫回读 `totalBytes=1,410,898`、`largestJavaScriptBytes=264,783`、`fileCount=91`。
- `pnpm test:desktop`：
  - Desktop Vitest 增至 10 个文件、50 项通过。
  - packaged macOS arm64 `.app` E2E 再次通过，耗时 2.9 秒。
- 阶段总门禁：TypeScript Web/Desktop、ESLint、Vitest 112 文件 664 项、theme guard 196 项、design lint、Web build、Desktop packaged E2E 均通过。

### Phase 2 — 平台边界

- 提交：`f985c08`。
- 平台门面：`src/lib/platform` 提供 Web/Desktop adapter；业务层不 import Electron。文件中心分享链接从裸 `navigator.clipboard` 迁到 `platform.clipboard`，原有文件模块 11 项测试通过。
- typed IPC：
  - 固定 `desktop:clipboard:write-text`、`desktop:external:open` channel，不向 Renderer 暴露 `ipcRenderer`。
  - 输入、输出由 `electron/shared/schemas.ts` 的 Zod schema 校验。
  - Main 在副作用前校验 `senderFrame` 必须来自 `app://renderer`；外链同时要求无凭据 HTTPS、默认端口和构建期 allowlist host。
  - Guard 会拒绝 Preload 的 `send/on/once` 与非 `ipcChannels` invoke。
- `pnpm test:desktop`：Desktop Vitest 12 个文件、60 项通过；packaged E2E 1 项通过（3.0 秒）。
- packaged IPC 证据：
  - 系统剪贴板真实写入 `electron-packaged-spike` 并回读，测试结束前恢复原剪贴板文本。
  - 外链自动化使用 Main `shell.openExternal` stub，证实 allowlist URL 被传入、非 allowlist URL 被拒；该证据不表述为真实系统浏览器已打开。
- Web 回归：Vitest 113 个文件、666 项通过；theme guard 196 项；design lint 0 error；Web 产物 `totalBytes=1,412,198`、最大 JS chunk `264,517` bytes。

## 平台证据矩阵

| 平台        | build                | install | backend                  | update  | uninstall | 签名            |
| ----------- | -------------------- | ------- | ------------------------ | ------- | --------- | --------------- |
| macOS arm64 | packaged `.app` 通过 | pending | packaged HTTPS/CORS 通过 | pending | pending   | 未签名；pending |
| macOS x64   | pending              | pending | pending                  | pending | pending   | pending         |
| Windows x64 | pending              | pending | pending                  | pending | pending   | pending         |

## 偏差记录

1. 原要求意图：sandbox Preload 必须是无外部依赖的单文件。实际做法：未使用 `electron-vite 5` 实验性的 `isolatedEntries`，改用单入口、`externalizeDeps: false`、`inlineDynamicImports: true`、CJS 输出。理由：`isolatedEntries` 在非 TTY 构建中无条件调用 `process.stdout.moveCursor` 并崩溃；替代做法保持相同安全产物约束，且可在无人值守环境稳定构建。
2. 工具链：因 `electron-vite 5.0.0` 的 peer 范围不支持 Vite 8，按用户确认将 Vite 固定为 `7.3.6`、React 插件固定为 `5.2.0`。共享 manual chunks 后 Web 最大业务入口从对比基线约 596 KiB 收敛为约 128 KiB。

## Pending 与后续人工动作

- 当前报告已完成 Phase 0–2 证据；Phase 3–8 继续实施。
- macOS x64、Windows x64 的真实安装、远程后端、更新、卸载和签名保持 pending，不能由当前 arm64 结果替代。
- 当前机器没有 Developer ID identity，macOS 真实旧版到新版签名更新闭环保持 pending，不声明通过。
