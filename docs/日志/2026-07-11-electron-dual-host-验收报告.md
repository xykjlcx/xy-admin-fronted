# Electron 双宿主验收报告

> 日期：2026-07-11  
> 分支：`codex/electron-dual-host`  
> 状态：Phase 0–8 工程实现已收口；缺少外部签名条件的验收项保持 `pending`，本报告不把它们写成通过。

## §20.1 对照表

| #   | 完成条件                                           | 当前状态 | 证据指针                                                          |
| --- | -------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| 1   | Packaged Spike                                     | 通过     | `pnpm test:desktop`；`e2e/electron/packaged-spike.spec.ts`        |
| 2   | 同一 `src/` 双构建、业务无 Electron 依赖、共享配置 | 通过     | `vite.renderer.config.ts`；`pnpm guard:desktop`；双构建产物守卫   |
| 3   | Web 登录、路由、主题、Mock 与既有测试零退化        | 通过     | `vitest` 682 项、`theme:guard` 196 项、`build:web` 与产物扫描     |
| 4   | 两种窗口模式与三套 Shell 安全区                    | 通过     | 双 packaged E2E；3 布局 × 3 比例截图与几何断言                    |
| 5   | Electron 凭证安全存储与统一会话服务                | 通过     | Phase 3 单元测试、架构守卫与 packaged `safeStorage` E2E           |
| 6   | 原生文件下载闭环                                   | 通过     | Phase 5 单元/页面测试；packaged Main stub 保存框 + 实际流式落盘   |
| 7   | 更新状态机、feed、metadata 与真实更新              | 部分通过 | generic feed/HTTP/metadata/公网回读工具通过；真实签名更新 pending |
| 8   | CSP、sandbox、隔离、fuses、导航、sender、schema    | 通过     | 安全窗口/IPC 门禁；四套 macOS 产物 fuse wire 实读                 |
| 9   | 全部门禁、visual、Electron E2E、平台 smoke         | 通过     | Web visual 24/24；Web 682、Desktop 169、双 E2E、arm64 DMG smoke   |
| 10  | 四份文档与代码一致                                 | 通过     | `architecture/AGENTS/README/desktop`；提交 `e662927`              |
| 11  | 既有改动未覆盖、提交可独立回滚                     | 通过     | 独立 worktree；Phase 0–8 中文原子提交；主工作区未触碰             |

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

### Phase 6 — 更新能力

- 提交：`6d0e75a`。
- Main 状态机：覆盖 `idle/checking/upToDate/available/downloading/downloaded/installing/error/cancelled`，快照固定携带 `operationId/lastCommand/retryable/errorCode`；命令合法性、check single-flight、下载取消/重试、安装只接受首次和 listener 释放均有纯逻辑测试。
- 更新源：`electron-updater` 使用构建期固定的 HTTPS generic provider，每个 packaged build 只指向 `stable/{platform}/{arch}`；`autoDownload=false`、`autoInstallOnAppQuit=false`、禁止 prerelease/downgrade，不传业务 token/header。
- 版本纪律：`package.json.version` 是唯一真值，Renderer 使用共享构建常量 `__APP_VERSION__`；历史 `VITE_APP_VERSION` 只作过渡检查，不再作运行时来源，不一致时构建直接失败。
- UI：Desktop Shell 后台联网检查；Header 仅在可用/下载/已下载/错误时显示入口；弹窗展示版本、日期、说明、大小、进度、速度、取消/重试/重启安装；错误只展示中英文脱敏摘要。Web 不渲染更新入口。
- HTTP 契约：本地契约测试覆盖 metadata `GET/HEAD + no-cache + Content-Length + MIME`，版本产物 `immutable + Range + Content-Length + MIME`；发布回读与 hash/metadata 综合校验在 Phase 7 收口。
- pending marker：调用 install 前以 `0600` 原子写入最小版本信息；packaged E2E 真实关闭并重新启动 `.app`，新进程 Renderer 健康加载后 marker 清除。
- packaged 对抗修正：首轮真实 ASAR 启动暴露 `electron-updater` CommonJS 不支持 ESM named import；改为默认导入互操作后 packaged 主进程正常启动。进度事件额外对 NaN/Infinity 归一化，防止第三方事件击穿共享 schema。
- 阶段门禁：Web Vitest 117 个文件/682 项；Desktop Vitest 23 个文件/142 项；theme guard 196 项；design lint 0 error；Web/Desktop TypeScript、ESLint 0 error、Web build、native/integrated build、双 packaged E2E 全通过。
- 产物回读：Web `totalBytes=1,426,652`、最大 JS `264,519` bytes；native Desktop `totalBytes=1,423,736`、integrated Desktop `totalBytes=1,423,740`，最大 JS 均为 `264,785` bytes。

### Phase 7 — 打包发布

- 提交：`b85cfa7`。
- 发布身份与签名入口：
  - `desktop.config.ts` 对 `appId/productName/executableName/copyright/macTeamId/windowsPublisher` 做 Zod 校验；脚手架占位身份显式不可发布。
  - `DESKTOP_RELEASE_BUILD=true` 时，macOS 强制 `CSC_NAME + APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID`，Windows 强制 `CSC_LINK + CSC_KEY_PASSWORD + publisher`；未注入即构建失败。
  - macOS 验证器回读 `codesign` Team ID 与 `ElectronAsarIntegrity`；Windows 路径通过 PowerShell 回读 Authenticode status/subject，正式包 publisher 不匹配即失败。
- release fuse profile 显式固定 Electron 43 的全部 9 个 V1 fuse；`afterPack` 先 flip 再实读，产物验证再次从可执行文件实读。`RunAsNode/NodeOptions/inspect/file 额外权限` 关闭，cookie encryption/ASAR integrity/only-ASAR/WASM trap handler 开启；因产物不含 browser V8 snapshot，该 fuse 显式关闭。
- 产物与 feed：
  - `pnpm make:desktop -- --window-chrome=native|integrated` 均成功；每种模式生成 macOS arm64/x64 的 DMG + ZIP + blockmap + `latest-mac.yml`。
  - 四套 ASAR 均为 103 个条目、约 2.24 MB，且无 `node_modules/.env/证书/测试/快照/.superpowers`；必含 Main、Preload、Renderer 与本地恢复页。
  - feed 按 `window chrome/stable/platform/arch` 隔离，先复制二进制与 blockmap，最后复制 metadata；回读校验 version/path/arch/size/SHA-512。
  - `verify:update-feed` 可对公网 HTTPS feed 执行 metadata GET/HEAD、artifact HEAD/Range/GET、cache/MIME/Content-Length 契约与全量 SHA-512 回读。本仓库未指定真实公网源，因此未伪造公网通过证据。
- 生命周期与可诊断性：首次安装无密文时不再提前访问 Keychain；退出前取消并等待下载临时文件清理；Renderer 加载失败进入本地恢复页；`userData/logs` 按大小轮转并脱敏；IPC 错误只记 channel/schema issue。
- 未签名 macOS arm64 DMG smoke：挂载、复制安装副本、`codesign --verify --deep --strict`、Main/Renderer/GPU/Network 进程、日志 `application ready/renderer healthy`、标准 Quit、删除安装副本与弹出 DMG 均通过。证据级别仅为“未签名安装包 smoke”。
- 对抗修正：实包启动首轮暴露 `safeStorage.isAsyncEncryptionAvailable()` 在无凭据时仍卡住 Keychain；调整为先读密文后再访问安全存储后启动通过。首轮 fuse 开启 browser-specific V8 snapshot 后实包因缺少 snapshot 启动失败；按实际产物能力显式关闭后四套产物均可启动/验证。
- 阶段门禁：Desktop Vitest 31 个文件/169 项；Web Vitest 117 个文件/682 项；theme guard 196 项；Web/Desktop TypeScript、ESLint 0 error、design lint、Web build、双 packaged E2E、双 `make` 全部通过。

### Phase 8 — 文档与最终收口

- 提交：`e662927`。
- 文档当前态：
  - `docs/architecture.md` 登记同一 `src/routeTree.gen.ts` 的 Web/Electron 双宿主图、Main/Preload/Platform 依赖方向、会话和配置真值。
  - `AGENTS.md` 增加 Electron 禁止项、typed IPC/Zod/sender、安全窗口/fuse、证据分级与双宿主门禁。
  - `README.md` 提供 Web/Desktop 快速开始、两种窗口模式与构建命令；`docs/desktop.md` 完整记录派生身份、产物矩阵、更新源、签名/公证/publisher、发布顺序、排障与证据级别。
  - `docs/NEW-PROJECT.md` 追加 Desktop 身份和最终窗口模式实例化清单；设计文档记录 Vite 回退、TS builder 与 V8 snapshot fuse 的等价实施。
- Web visual（Agent Browser CLI 0.25.4）：
  - 采集 20 个原型基线、20 个实现侧页面和 20 张 diff；差异比例为 1.96%–8.59%，作为已知产品演进证据，不伪写为像素完全一致。
  - 90%/100%/108% 三档通过无水平溢出、status popover/detail sheet/role permissions/menu dialog 视口与缩放契约，并遍历 6 个 Admin 和 7 个 Lastmile 已完成页。
  - flavor × light/dark × scale 矩阵 24/24，`page-ready/state-applied/no-horizontal-overflow/sera-computed-contracts` 全部通过。证据位于 gitignore 的 `test-results/m0-visual/`。
- 最终门禁：
  - `tsc -b --noEmit`、`eslint src`（0 error，保留 1 条既有 TanStack Table compiler warning）、Web Vitest 117/682、theme guard 4/196、design lint 0 error/40 条已登记 warning、Desktop typecheck 全部通过。
  - `pnpm test:desktop`：Desktop Vitest 31/169；native packaged E2E 4.4 秒；integrated packaged E2E 10.2 秒。
  - `build:web`：`1,426,739` bytes/90 files；Desktop native `1,425,052` bytes/93 files；Desktop integrated `1,425,056` bytes/93 files；最大 JS 分别为 `264,519/264,785/264,785` bytes。Web 无 Electron/Node/Preload，Desktop Renderer 无 Mock 运行时。
  - Phase 7 同一运行时代码已执行 native/integrated 双 `make`、四套 macOS 产物校验与 arm64 DMG smoke；Phase 8 仅修改文档，未使产物证据失效。

## 平台证据矩阵

| 平台        | build                              | install               | backend                      | update  | uninstall        | 签名                     |
| ----------- | ---------------------------------- | --------------------- | ---------------------------- | ------- | ---------------- | ------------------------ |
| macOS arm64 | native/integrated DMG+ZIP 通过     | 未签名 DMG smoke 通过 | packaged HTTPS/CORS/下载通过 | pending | 隔离副本删除通过 | ad-hoc；正式签名 pending |
| macOS x64   | pending（产物生成/自动校验已执行） | pending               | pending                      | pending | pending          | pending                  |
| Windows x64 | pending                            | pending               | pending                      | pending | pending          | pending                  |

## 偏差记录

1. 原要求意图：sandbox Preload 必须是无外部依赖的单文件。实际做法：未使用 `electron-vite 5` 实验性的 `isolatedEntries`，改用单入口、`externalizeDeps: false`、`inlineDynamicImports: true`、CJS 输出。理由：`isolatedEntries` 在非 TTY 构建中无条件调用 `process.stdout.moveCursor` 并崩溃；替代做法保持相同安全产物约束，且可在无人值守环境稳定构建。
2. 工具链：因 `electron-vite 5.0.0` 的 peer 范围不支持 Vite 8，按用户确认将 Vite 固定为 `7.3.6`、React 插件固定为 `5.2.0`。共享 manual chunks 后 Web 最大业务入口从对比基线约 596 KiB 收敛为约 128 KiB。
3. 原文件名：设计文档以 `electron-builder.yml` 为配置载体。实际改为 `electron-builder.ts`，并由守卫禁止 YAML/TS 双配置并存。理由：发布身份、平台签名前置条件和 Spike fuse 例外需要可类型检查、可单测的动态配置；安全、范围与产物目标不变。

## Pending 与后续人工动作

- Phase 0–8 工程实现、文档与当前平台可执行证据已收口；本目标累计执行 4 小时以上。
- 原生保存框自动化是 Main stub；真实 macOS/Windows 保存框点击 smoke 保持 pending。
- macOS x64、Windows x64 的真实安装、远程后端、更新、卸载和签名保持 pending，不能由当前 arm64 结果替代。
- 当前机器没有 Developer ID identity，macOS 真实旧版到新版签名更新闭环保持 pending，不声明通过。
- 本仓库没有真实公网 update base/CDN，因此 `verify:update-feed` 工具与本地 HTTP 契约已通过，真实公网回读保持 pending。
- 由于 §20.1 第 7 条明确要求至少一个平台完成满足签名前提的真实旧版→新版更新，当前不将「§20.1 全部 11 条」整体标记为通过；该 pending 只能在注入有效签名身份并真实执行升级后消除。
