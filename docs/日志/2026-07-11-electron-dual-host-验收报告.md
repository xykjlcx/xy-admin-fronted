# Electron 双宿主验收报告

> 日期：2026-07-11  
> 分支：`codex/electron-dual-host`  
> 状态：实施中；本报告只登记已执行证据，未完成项保持 `pending`。

## §20.1 对照表

| #   | 完成条件                                           | 当前状态 | 证据指针                                                         |
| --- | -------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| 1   | Packaged Spike                                     | 通过     | `pnpm test:desktop`；`e2e/electron/packaged-spike.spec.ts`       |
| 2   | 同一 `src/` 双构建、业务无 Electron 依赖、共享配置 | 通过     | `vite.renderer.config.ts`；`pnpm guard:desktop`；双构建产物守卫  |
| 3   | Web 登录、路由、主题、Mock 与既有测试零退化        | 阶段通过 | `vitest` 677 项、`theme:guard` 196 项、`build:web` 与产物扫描    |
| 4   | 两种窗口模式与三套 Shell 安全区                    | 通过     | 双 packaged E2E；3 布局 × 3 比例截图与几何断言                   |
| 5   | Electron 凭证安全存储与统一会话服务                | 通过     | Phase 3 单元测试、架构守卫与 packaged `safeStorage` E2E          |
| 6   | 原生文件下载闭环                                   | 通过     | Phase 5 单元/页面测试；packaged Main stub 保存框 + 实际流式落盘  |
| 7   | 更新状态机、feed、metadata 与真实更新              | pending  | Phase 6–7；真实签名更新需满足签名前提                            |
| 8   | CSP、sandbox、隔离、fuses、导航、sender、schema    | 实施中   | Phase 0 已验证 CSP/窗口隔离/导航；IPC 与 release fuse 待后续阶段 |
| 9   | 全部门禁、visual、Electron E2E、平台 smoke         | 实施中   | Phase 0 自动化与 macOS arm64 未签名 packaged smoke 已登记        |
| 10  | 四份文档与代码一致                                 | pending  | Phase 8                                                          |
| 11  | 既有改动未覆盖、提交可独立回滚                     | 通过     | 独立 worktree；Phase 0–5 独立提交，最新 `0e75378`                |

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

### Phase 3 — 鉴权与安全存储

- 提交：`84d39b6`。
- 统一会话：Zustand auth store 只保留进程内 token；`SessionCredentialService` 是 restore/replace/clear 的唯一入口，登录、短信登录、二维码登录、登出和 401 均通过该服务。Web adapter 继续读写既有 Zustand localStorage envelope，Web 刷新语义不变。
- Main credential vault：
  - 使用 `safeStorage.encryptStringAsync/decryptStringAsync`，加密能力不可用时拒绝持久化且不回退明文。
  - 密文通过 `0600` 临时文件与 rename 原子写入 `userData/credentials/session.bin`；轮换标记触发重加密；restore single-flight 且只解密一次。
  - persist 失败不发布内存 token；clear 先清 active token，再删除密文；物理清理失败仍立即清 Renderer token 与 Query cache，并给用户反馈。
- 架构守卫：新增 `setToken` 唯一入口和 `platform.credentials` 唯一消费方断言；Main/Preload 的凭证 channel 全部经过 sender 校验与 Zod 输入/输出校验。
- RED → GREEN：凭证 vault、统一会话、Web 兼容 envelope、IPC schema、直接 `setToken`、直接 credential adapter、Spike userData 隔离均先见失败再实现。
- packaged 证据：
  - 真实持久化 `packaged-vault-token` 后，密文文件存在且 bytes 不包含明文 token；Desktop `localStorage.auth` 始终为空。
  - Preload restore 回读成功；clear 后密文消失；真实登录后 401 再次确认 localStorage 为空且密文已删除。
  - 首轮 packaged 运行揭示共用 config 引入 `node:path` 会导致 sandboxed Preload 加载失败；路径逻辑移至 Main 专属模块后同一用例转绿，防止用 dev server 掩盖 packaged 限制。
- 阶段门禁：Desktop Vitest 14 个文件、70 项；packaged E2E 1 项（3.0 秒）；Web Vitest 114 个文件、671 项；theme guard 196 项；design lint 0 error；Web/Desktop TypeScript、ESLint 与双构建全部通过。
- 产物回读：Web `totalBytes=1,413,812`、最大 JS `264,519` bytes；Desktop `totalBytes=1,412,469`、最大 JS `264,785` bytes。

### Phase 4 — 窗口 chrome 与三布局安全区

- 提交：`214ff10`。
- 构建选择：`--window-chrome=native|integrated` 继续作为构建期参数；macOS integrated 使用 `hiddenInset`，Windows integrated 使用官方要求的 `titleBarStyle: hidden` + `titleBarOverlay.height: 56`，native 仍保留系统标准标题栏。
- 宿主状态：Main 在 `did-finish-load`、maximize/unmaximize、enter/leave-full-screen、`display-metrics-changed` 时发布严格 Zod snapshot；Preload 只暴露 `getSnapshot/subscribe`，App 将状态投影为 root data attributes 与 3 个 CSS token。全屏时 inset/titlebar 归零，退出后恢复；窗口关闭前解绑，避免 destroyed webContents 拖住 app quit。
- 三套 Shell 独立消费：
  - `sidebar`：macOS 左 inset 由 `ShellHeader` start 消费；Windows 右 inset 由 Header actions 消费。
  - `rail`：macOS 由 `NavMenuRail` 顶部窗口区消费；右侧 Header 不重复吃左 inset；Windows 不产生多余左上留白。
  - `inset`：macOS 由 `NavMenuInset` brand 区消费；Windows 由 `inset-shell-header-suffix` 消费。
  - integrated 顶带声明 `app-region: drag`；按钮、链接、输入、菜单和搜索区统一 `no-drag`。Web/native token 恒为 0，原布局位置不变。
- packaged 自动化：
  - `pnpm test:desktop` 顺序构建并启动 native 与 integrated 两个 packaged `.app`；native 协议/安全/鉴权用例 1 项通过，integrated chrome 用例 1 项通过。
  - integrated 用真实 HTTPS Spike 会话进入 dashboard，遍历 sidebar/rail/inset × 90%/100%/108%，逐项断言 `--app-scale`、安全区、无横向溢出，并生成 9 张最终态截图到忽略目录 `test-results/electron-chrome/`。
  - packaged 实测 maximize/unmaximize data state 正确；进入全屏后左右 inset 均为 0，退出后恢复 macOS 左 80 DIP。Windows 分支按右 138 DIP 自动切换断言，当前平台未伪装为 Windows 通过。
- 对抗性修正：首次状态接线在 `closed` 后访问已销毁 webContents，导致 Playwright close 超时；解绑前移到 `close` 后同一 native packaged 用例恢复至约 2.9 秒。截图首轮捕获到 PageTransition 淡入帧；等待 350 ms 动画稳定后重采，视觉抽查清晰。
- 阶段门禁：Desktop Vitest 16 个文件、78 项；Web Vitest 115 个文件、674 项；theme guard 196 项；design lint 0 error；Web/Desktop TypeScript、ESLint、Web build、双 packaged E2E 全通过。
- 产物回读：Web `totalBytes=1,416,658`、最大 JS `264,519` bytes；integrated Desktop `totalBytes=1,415,321`、最大 JS `264,785` bytes。

### Phase 5 — 文件能力

- 提交：`0e75378`。
- Main 下载安全边界：
  - Renderer 只提交 Zod 校验后的 `resourceId + suggestedName`，目标路径只来自系统保存框；Main 从 `VITE_API_BASE_URL` 构造 `/api/files/{id}/download`，不接受绝对下载 URL 或 Renderer 路径。
  - 文件名清理路径分隔符、控制字符、Windows 保留名和尾随点/空格，并在保留合理扩展名的前提下限制为 180 字符。
  - Electron `net.request` 使用 `credentials: omit`、无 session cookie、`Accept-Encoding: identity` 和手动逐跳重定向；同源保留 vault Authorization，一旦跨 origin 永久剥离，且目标必须命中显式 HTTPS origin allowlist。
  - 重定向最多 5 次；HTTP 降级、未知协议、未批准 origin、循环、缺失/非法 Content-Length、长度不一致和磁盘空间不足均进入稳定错误码。
  - 下载流写入目标目录内的随机 `.part` 文件，处理 partial write；成功后 rename 原子替换，失败/取消清理临时文件。进度按百分比去重，避免小 chunk 导致 IPC 洪泛。
- Platform/UI：Web 保留 fetch + `<a download>`，Desktop 通过 typed Preload IPC；文件预览展示进度、支持按 task id 取消并阻止保存框等待期重复提交。分享链接由 Web public base 生成，业务不再读取 `window.location.origin`；远程 HTTP public base 被拒绝，本地 localhost 开发例外。
- RED → GREEN：文件描述符/event schema、文件名、redirect/auth 剥离、缺失长度、磁盘不足、长度不符、取消清理、IPC sender、Web adapter、分享地址、UI 进度/取消/single-flight、Spike Main 下载均先见失败再实现；新增守卫拒绝文件业务回退到裸 `downloadFile` 或 `window.location.origin`。
- packaged 自动化：
  - `pnpm test:desktop`：Desktop Vitest 17 个文件、107 项通过；native packaged E2E 1 项 3.1 秒，integrated packaged E2E 1 项 8.8 秒。
  - Playwright 使用设计文档 §17.2 允许的 **Main 保存框 stub**，目标限制在隔离 Spike `userData` 内；该证据不表述为真实 OS 对话框点击。
  - 实际 Main `net` 请求经历 `/download → /content` 同源重定向，两跳均由 HTTPS Spike 服务回读 `hasAuthorization: true`；最终文件 bytes 为 `electron-download-evidence`，事件包含 0%/100%/completed，payload 不含目标路径或 Authorization。
  - 首轮 packaged 验证暴露 Main `net` 不沿用 Renderer 自签名证书处理；修复为仅在 `DESKTOP_SPIKE_MODE=true` 时接受 localhost、拒绝其他 host 的 session verifier，正式构建不开启。
- 阶段门禁：Web/Desktop TypeScript、ESLint 0 error、Web Vitest 115 个文件/677 项、theme guard 196 项、design lint 0 error、Web build、Desktop unit、双 packaged E2E 全通过。
- 产物回读：Web `totalBytes=1,419,843`、最大 JS `264,519` bytes；integrated Desktop `totalBytes=1,417,499`、最大 JS `264,785` bytes。

## 平台证据矩阵

| 平台        | build                                  | install | backend                      | update  | uninstall | 签名            |
| ----------- | -------------------------------------- | ------- | ---------------------------- | ------- | --------- | --------------- |
| macOS arm64 | native/integrated packaged `.app` 通过 | pending | packaged HTTPS/CORS/下载通过 | pending | pending   | 未签名；pending |
| macOS x64   | pending                                | pending | pending                      | pending | pending   | pending         |
| Windows x64 | pending                                | pending | pending                      | pending | pending   | pending         |

## 偏差记录

1. 原要求意图：sandbox Preload 必须是无外部依赖的单文件。实际做法：未使用 `electron-vite 5` 实验性的 `isolatedEntries`，改用单入口、`externalizeDeps: false`、`inlineDynamicImports: true`、CJS 输出。理由：`isolatedEntries` 在非 TTY 构建中无条件调用 `process.stdout.moveCursor` 并崩溃；替代做法保持相同安全产物约束，且可在无人值守环境稳定构建。
2. 工具链：因 `electron-vite 5.0.0` 的 peer 范围不支持 Vite 8，按用户确认将 Vite 固定为 `7.3.6`、React 插件固定为 `5.2.0`。共享 manual chunks 后 Web 最大业务入口从对比基线约 596 KiB 收敛为约 128 KiB。

## Pending 与后续人工动作

- 当前报告已完成 Phase 0–5 证据；Phase 6–8 继续实施。
- 原生保存框自动化是 Main stub；真实 macOS/Windows 保存框点击 smoke 保持 pending。
- macOS x64、Windows x64 的真实安装、远程后端、更新、卸载和签名保持 pending，不能由当前 arm64 结果替代。
- 当前机器没有 Developer ID identity，macOS 真实旧版到新版签名更新闭环保持 pending，不声明通过。
