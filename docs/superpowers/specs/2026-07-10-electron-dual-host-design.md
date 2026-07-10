# Electron 双宿主打包与在线更新设计

日期：2026-07-10  
状态：已完成对抗审阅，待用户复核

## 1. 结论

本仓库改造成**同一套 React Renderer、Web 与 Electron 两种宿主、三种交付命令**的脚手架：

```text
同一套 src/
├── Web：Vite → dist/
└── Desktop：electron-vite → out/{main,preload,renderer}
                         ↓
                electron-builder
                         ↓
       macOS DMG/ZIP · Windows NSIS · update metadata
```

开发过程在独立功能分支完成，最终合回主线；不维护长期 Electron 分支，不复制业务代码，不把桌面能力散进业务模块。

桌面端是在线客户端，继续连接远程 HTTPS 后端；不引入 SQLite、本地后端、离线同步或本地服务。首期覆盖 macOS arm64/x64 与 Windows x64，并内置用户主动确认的在线更新能力。

## 2. 已定需求

| 决策项          | 结论                                                 |
| --------------- | ---------------------------------------------------- |
| 代码形态        | 单仓库、同一套业务代码、Web/Electron 双宿主          |
| 数据形态        | 在线连接远程后端，不做本地数据库和离线同步           |
| 交付层级        | 脚手架级；不绑定真实证书、企业身份或更新服务器       |
| 桌面平台        | macOS arm64/x64；Windows x64                         |
| 更新源          | 可配置的通用 HTTPS 静态更新源                        |
| 更新通道        | 首期只做 `stable`                                    |
| 更新交互        | 后台检查；用户点击下载；展示进度；用户点击重启安装   |
| token           | Web 延续浏览器策略；Electron 使用系统安全存储        |
| 窗口模式        | 打包时可选 `native` 或 `integrated`                  |
| integrated 布局 | A 方案：保留原生窗口按钮，按三套 Shell 的实际顶层结构预留安全区 |
| 打包更新工具    | `electron-builder + electron-updater`                |

## 3. 范围

### 3.1 首期包含

- Web 与 Electron 两套开发、构建、打包命令。
- Electron Main、Preload、共享 IPC 契约与 Renderer 平台适配层。
- 自定义安全协议、桌面路由、CSP、导航限制与权限请求策略。
- 单实例运行和 macOS/Windows 基础窗口生命周期。
- `native` / `integrated` 两种窗口 chrome 构建模式。
- Electron token 安全存储与启动恢复。
- 原生文件保存、下载进度、系统剪贴板、外部浏览器打开。
- `stable` 通道在线检查、下载、进度、重启安装和错误恢复。
- macOS arm64/x64 的 DMG + ZIP；Windows x64 的 NSIS 安装包。
- Main/Preload 单测、架构守卫、Electron 开发态 E2E 与安装包 smoke 清单。
- 同步更新架构、执行规则、README 和桌面运维文档。

### 3.2 首期不包含

- SQLite、本地后端、离线缓存、离线同步和冲突解决。
- 托盘常驻、开机启动、系统级消息通知、Deep Link、多窗口和全局快捷键。
- 完全无边框窗口、自绘 macOS 红黄绿按钮或 Windows 窗口按钮。
- beta 通道、灰度比例、强制更新、版本降级和增量发布控制台。
- App Store、Microsoft Store、MSI、企业 MDM 分发。
- 在仓库中内置或提交真实签名证书、公证账号和更新服务器凭据；测试/正式签名身份只能由外部安全环境注入。
- 把当前文件管理 Mock 元数据上传包装成真实文件存储。
- 未经单独确认修改现有 CI/CD。

## 4. 当前架构影响判断

当前 `src/` 已将 App 装配、Config、Routes、业务纵切包、UI/Pro、Lib 和 Stores 分层；服务端状态集中在 TanStack Query，接口统一经过 Zod contract。这使桌面化可以停留在宿主与基础设施层：

- `src/modules/**`、`src/routes/**`、`src/components/**` 和绝大多数 `src/app/**` 原样复用。
- `src/app/mount.tsx` 增加宿主初始化与桌面 history 选择。
- `src/config` 增加 Renderer 可消费的宿主配置，不承载 Electron Main 配置。
- `src/lib` 增加平台能力适配层。
- `src/stores/auth.ts` 从“直接持久化实现”改为“内存状态 + 宿主凭证仓库”。
- `src/lib/download.ts` 迁移为平台下载门面。
- `src/app/shell` 只消费窗口安全区 token，不直接 import Electron。

桌面化不是业务页面迁移，也不允许借机重构纵切包、Query key、表格、主题或权限体系。

## 5. 目录与依赖边界

```text
electron/
├── main/
│   ├── index.ts                 # app 生命周期与唯一启动入口
│   ├── create-window.ts         # BrowserWindow 创建
│   ├── protocol.ts              # app://renderer 资源协议
│   ├── navigation-policy.ts     # 导航、新窗口、外链与权限策略
│   ├── ipc.ts                   # IPC handler 聚合
│   └── credential-vault.ts      # safeStorage + 原子落盘
├── preload/
│   └── index.ts                 # contextBridge 白名单
├── updater/
│   ├── controller.ts            # electron-updater 编排
│   ├── state.ts                 # 纯状态机
│   └── schema.ts                # 更新配置与事件 schema
├── files/
│   ├── download-manager.ts      # 下载、保存和进度
│   └── schema.ts
├── shared/
│   ├── desktop-api.ts           # Window API TypeScript 契约
│   ├── ipc-channels.ts          # 固定 channel 目录
│   └── schemas.ts               # IPC 输入/输出 Zod schema
└── config/
    └── index.ts                 # Main 唯一 process.env 读取点

src/lib/platform/
├── index.ts                     # 业务调用的唯一入口
├── types.ts                     # 宿主无关语义接口
├── web.ts                       # 浏览器实现
└── desktop.ts                   # window.desktop 适配

desktop.config.ts                # 非敏感桌面默认配置
electron.vite.config.ts          # Main/Preload/Renderer 桌面构建
electron-builder.yml             # 安装包、产物和更新元数据
```

依赖方向：

```text
routes/modules/app/components
            ↓
      lib/platform
       ↓         ↓
   Web API   window.desktop
                   ↓
               Preload
                   ↓
                Main
                   ↓
          OS / safeStorage / updater
```

守卫规则：

- `src/**` 禁止 import `electron`、`electron-updater`、Node `fs/path/child_process`。
- `window.desktop` 只允许出现在 `src/lib/platform/desktop.ts` 和对应测试。
- `electron/**` 禁止 import `@/modules/**`、Routes、React 组件和业务 DTO。
- Main 不能暴露任意 IPC channel、任意文件读写、任意命令执行或未校验 URL。
- IPC DTO 只从 `electron/shared/schemas.ts` 的 Zod schema 推导。

## 6. 构建工具链

### 6.1 分工

- 现有 Vite：继续负责 Web 开发和生产构建。
- `electron-vite`：负责 Electron Main、Preload、Renderer 三种上下文的开发热更新和生产输出。
- `electron-builder`：负责 app 打包、DMG/ZIP、NSIS、签名配置入口和更新元数据。
- `electron-updater`：负责通用 HTTPS 更新源、签名校验、下载进度和安装编排。

不采用 Electron Forge Vite plugin：官方页面仍将其标为 experimental，而本项目已有复杂 Vite/Tailwind/TanStack Router 配置，没有必要为官方模板迁移现有 Renderer。`electron-vite` 只作为桌面构建编排器，Web 仍以当前 `vite.config.ts` 为真值。

### 6.2 共享 Renderer 配置

Web 与 Desktop Renderer 不能各维护一份 Vite 插件清单。先从当前 `vite.config.ts` 提取纯共享工厂：

```ts
type RendererTarget = 'web' | 'desktop';

interface RendererConfigOptions {
  target: RendererTarget;
  command: 'serve' | 'build';
  mode: string;
  outDir: 'dist' | 'out/renderer';
  base: string;
}

declare function createRendererConfig(options: RendererConfigOptions): UserConfig;
```

- `vite.config.ts` 与 `electron.vite.config.ts` 的 Renderer 配置都调用该工厂。
- TanStack Router、React、Tailwind、alias、Mock 生产门禁和 Mock worker 剥离逻辑只有一个定义源。
- `stripMockWorkerPlugin` 必须接收实际 `outDir`，禁止继续硬编码 `dist/`。
- Web 使用 browser history 和现有 base；Desktop 使用 hash history 和相对静态资源 base，这些差异由显式 target 参数控制。
- 两套构建消费同一份 `src/routeTree.gen.ts`，禁止生成 Desktop 专属路由树。
- 共享工厂本身不读取 `process.env` 或 `import.meta.env`；环境值由各自唯一配置入口解析、校验后传入。

### 6.3 命令契约

保留现有命令语义：

```bash
pnpm dev                      # Web 开发
pnpm build                    # Web 生产构建，兼容现有使用者
pnpm build:web                # Web 显式别名

pnpm dev:desktop -- --window-chrome=integrated
pnpm build:desktop -- --window-chrome=native
pnpm make:desktop -- --window-chrome=integrated
pnpm test:desktop
```

由跨平台 Node 脚本解析 `--window-chrome`，禁止在 package scripts 中使用只兼容 Unix 的环境变量写法。非法值、缺失生产 API 地址、缺失生产更新地址必须在构建开始前失败。

环境读取继续分域：Renderer 仍只有 `src/config/env.ts` 可以读取 `import.meta.env`；Main 只有 `electron/config/index.ts` 可以读取 `process.env`。`desktop.config.ts` 只放可提交的非敏感默认值，证书和发布凭据只能从构建环境注入。

### 6.4 产物边界

```text
dist/                         # Web 产物
out/main/                     # Electron Main
out/preload/                  # Electron Preload
out/renderer/                 # Electron Renderer
release/                      # 安装包和更新元数据
```

Electron 包只包含编译产物、静态资源和 Main 真正需要的运行时依赖。React、Radix、TanStack 等已经进入 Renderer bundle 的依赖不得再以完整 `node_modules` 重复打包；该约束用产物清单测试和体积基线守住。

## 7. 双宿主启动与路由

### 7.1 Web

- 继续使用当前 Vite server、默认浏览器 history 和现有 URL。
- `pnpm dev`、`pnpm build`、Mock 门控和生产剥离行为不退化。

### 7.2 Electron

- Main 注册 `app://renderer` 标准、安全、自有协议，只映射 `out/renderer` 内的白名单资源；scheme 仅开启 `standard`、`secure`、`supportFetchAPI`、`corsEnabled` 等必要能力，不允许 Service Worker。
- 不使用 `file://`，不允许目录穿越，不开启 `bypassCSP`。
- 生产 Renderer URL：`app://renderer/index.html#/admin/dashboard`。
- Electron 使用 TanStack Router hash history；Web 继续使用 browser history。
- Search 参数仍由 TanStack Router 管理，可后退、前进和刷新恢复。
- 全局 401 redirect 必须从 `router.state.location` 取路径，不能读取 `window.location.pathname`，因为桌面 pathname 是宿主资源路径。
- Electron Renderer 使用相对静态资源 base；Web 维持当前 base。

首期没有 Deep Link，因此不建立外部 URL 到内部路由的公共协议。内部导航仍只使用 TanStack Router。

### 7.3 Packaged 纵向 Spike

正式实现平台能力前，先用最小 packaged app 证明以下链路：

1. `app://renderer` 只加载 `out/renderer` 白名单资源，favicon、动态 chunk 和字体均使用正确相对路径。
2. Hash 路由能进入业务页，并在刷新、后退、前进后恢复 path 与 search。
3. Renderer 通过现有 HTTP/Zod 层调用真实 HTTPS 测试接口，后端明确接受实际收到的 Desktop Origin。
4. CSP 生效，任意导航、新窗口和未授权权限请求被拒绝。
5. 401 redirect 从 `router.state.location` 读取内部路由，不产生 `app://renderer/index.html` redirect。

Spike 必须运行在 packaged 产物，不以 Vite dev server 结果替代。任一项失败都先修正协议、base、CORS 或 Router 设计，再进入后续阶段。

## 8. 窗口 chrome 模式

### 8.1 配置

```ts
type WindowChromeMode = 'native' | 'integrated';
```

模式在打包时选择，安装后不向最终用户暴露切换项。一个 appId + version 只能发布一种 chrome 模式，禁止同版本向同一更新源发布两种外观不同的包。

### 8.2 `native`

- macOS 和 Windows 使用标准系统标题栏。
- React Shell 的窗口安全区均为 0。
- 现有 Header、子系统切换器和三套 Shell 布局不改变位置。
- 作为兼容风险最低、派生项目可直接使用的默认模式。

### 8.3 `integrated`

- macOS 使用 `titleBarStyle: 'hiddenInset'` 保留系统红黄绿按钮；左侧安全区由当前 Shell 最靠近窗口左上角的顶层区域消费。
- Windows 使用 `titleBarOverlay` 保留系统右上角窗口按钮；右侧安全区由当前 Shell 最靠近窗口右上角的操作区消费。
- 可拖动区域按 Shell 顶层结构声明；按钮、搜索框、菜单、Popover trigger、表单和滚动区域均为 `no-drag`。
- 窄窗口下复用现有响应式行为，子系统切换器收缩为图标，不能挤压 Header 中心区。
- 最大化、全屏、显示比例和平台变化均通过宿主状态重新计算安全区。

三套布局的消费位置固定如下，禁止用一条全局 Header padding 规则覆盖：

| Shell       | macOS 左侧安全区消费者                               | Windows 右侧安全区消费者       |
| ----------- | --------------------------------------------------- | ------------------------------ |
| `sidebar`   | `ShellHeader` start，子系统切换器在同一顶带内右移   | `ShellHeader` actions          |
| `rail`      | `NavMenuRail` 顶部窗口区；右侧 Header 不消费左 inset | `ShellHeader` actions          |
| `inset`     | `NavMenuInset` brand 区；内容卡 Header 不消费左 inset | `inset-shell-header-suffix`    |

这仍然保持 A 方案的视觉原则：系统按钮与应用顶层导航位于同一视觉顶带，但不强迫三套布局具有相同 DOM 结构。

Main/Preload 向 Renderer 提供：

```text
data-runtime="web | desktop"
data-window-chrome="native | integrated"
data-platform="darwin | win32"

--window-controls-inset-left
--window-controls-inset-right
--desktop-titlebar-height
```

Web 和 `native` 模式的三个 CSS 变量为 0。Shell 只消费 token，不读取 `process.platform`，也不包含 Electron 条件分支。

## 9. 安全模型

BrowserWindow 固定：

```text
nodeIntegration: false
contextIsolation: true
sandbox: true
webSecurity: true
```

必须同时做到：

- CSP 默认 `default-src 'self'`，Renderer 的 `connect-src` 只按配置精确开放 API 域名；更新由 Main 发起，不把更新域名暴露给 Renderer CSP。
- 开发态只额外开放当前 Vite dev server 与 HMR WebSocket；这些规则不能进入 packaged production CSP。
- `script-src` 禁止 `unsafe-inline` 和 `unsafe-eval`；当前 `index.html` 内联主题初始化脚本外置或使用固定 hash。
- 当前组件体系使用计算宽度、主题色和 CSS variable 等 React inline style。首期 production CSP 明确使用 `style-src-elem 'self'` 与受限的 `style-src-attr 'unsafe-inline'`；该权限只解决 style attribute，不得扩大到 script，也不得拼接外部 URL。若未来移除全部 inline style，再收紧该指令。
- 拒绝 Renderer 内部任意导航；合法 HTTPS 外链经过校验后交给系统浏览器。
- 拒绝未经允许的新窗口、权限请求和下载来源。
- IPC handler 校验 sender frame 必须来自 `app://renderer`。
- IPC 输入、输出和事件 payload 经过 Zod 校验。
- Preload 每个能力一个语义方法，不能暴露 `ipcRenderer.send/invoke/on`。
- 文件路径由 Main 生成或由系统对话框返回，Renderer 不提交任意目标路径。
- 外链只允许 `https:`；首期不允许 `file:`、`javascript:`、`data:` 和自定义外部协议。
- 保持 Electron 当前稳定版本升级节奏；安全更新不能长期冻结。
- 打包阶段使用 `@electron/fuses` 固定 release profile：`RunAsNode=false`、`EnableNodeOptionsEnvironmentVariable=false`、`EnableNodeCliInspectArguments=false`、`EnableEmbeddedAsarIntegrityValidation=true`、`OnlyLoadAppFromAsar=true`。开发态和 Playwright 使用未翻转 fuse 的开发 Electron，不复用 release 二进制做调试。
- 打包后读取实际 fuse wire 并断言 release profile；不能只检查配置文件。若目标 Electron 版本不支持某个 fuse，构建直接失败并要求升级设计，不静默跳过。

## 10. 平台 API

Renderer 业务只面向语义接口：

```ts
interface AppPlatform {
  readonly runtime: 'web' | 'desktop';
  readonly window: WindowPlatform;
  readonly credentials: CredentialPlatform;
  readonly files: FilePlatform;
  readonly clipboard: ClipboardPlatform;
  readonly external: ExternalPlatform;
  readonly updater: UpdatePlatform;
}
```

职责：

- `window`：宿主信息和窗口 chrome 安全区，只允许 App/Shell 消费。
- `credentials`：提供宿主级 restore/persist/clear 原语，只允许统一会话服务消费，业务和页面不得直接调用。
- `files`：保存远程文件和订阅进度。
- `clipboard`：写文本；Web 使用 Clipboard API，Desktop 使用 Electron clipboard。
- `external`：打开校验后的 HTTPS URL。
- `updater`：检查、下载、安装、订阅状态；Web 实现明确返回 unsupported，不渲染入口。

业务页面不得按 `runtime === 'desktop'` 到处分支。能力差异由 adapter 吸收；只有 Shell 这类宿主 UI 可以根据 capability 决定是否展示入口。

## 11. 鉴权与安全存储

### 11.1 状态模型

- Zustand auth store 只保存运行时 token，不再拥有持久化策略。
- Web credential adapter 维持现有浏览器持久化语义。
- Electron credential adapter 调用 Preload，由 Main 优先使用非阻塞的 `safeStorage.encryptStringAsync/decryptStringAsync` 加密；必须处理异步能力暂时不可用，以及 `decryptStringAsync` 返回的 `result/shouldReEncrypt`，需要轮换时用明文 result 重新加密并原子替换旧 ciphertext；不退回明文存储。
- 加密后的 bytes 写入 `app.getPath('userData')` 下的专用文件，采用临时文件 + rename 原子替换。
- credential vault 启动时只解密一次并持有 Main 进程内 active token；下载不在每次请求时重读磁盘。clear 先把 active token 置空，再写入“无凭证”状态，避免物理清理失败后当前进程继续使用旧 token。
- token 不出现在日志、更新请求、异常详情和构建产物中。

Renderer 新增唯一 `SessionCredentialService`，作为 token 生命周期真值入口：

```ts
interface SessionCredentialService {
  restore(): Promise<string | null>;
  replace(token: string): Promise<void>;
  clear(reason: 'logout' | 'expired' | 'switch-account'): Promise<void>;
}
```

- 只有该服务可以调用 credential adapter、修改 Zustand token 和清理 QueryClient。
- HTTP 层继续只从内存 store 读取当前 token；Main 下载管理器只从同一 credential vault 读取当前 token。
- 登录、短信登录、二维码登录、token refresh、切换账号、主动登出和 401 都必须经过该服务，禁止直接调用 `setToken`。
- 架构守卫只允许该服务和 auth store 自测出现 `setToken(`；现有 `resetSession` 语义并入该服务，不保留第二入口。

### 11.2 启动顺序

```text
Main ready
  → create BrowserWindow
  → Renderer bootstrap
  → credential adapter restore
  → 写入内存 auth store
  → 启动 Mock 门控 / i18n
  → mount Router
```

这样避免先进入登录页再跳受保护页。恢复失败按“无会话”处理并记录非敏感错误，不阻塞应用启动。

### 11.3 登出与过期

- 登录成功：先持久化 token，再更新 store，最后 invalidate Router。
- 登录持久化失败：不更新 store、不进入受保护路由，向用户返回明确错误，避免 Main vault 与 Renderer store 分叉。
- 主动登出/401：先离开受保护树，再立即清内存 token、cancel/clear QueryClient，最后尝试清安全存储。
- 安全存储清理失败必须反馈，但内存 token 与 Query cache 仍立即清除，不能继续保持已登录 UI。
- token refresh 先持久化新 token，再替换内存 token；失败时保留旧 token 或统一过期退出，禁止只更新一侧。
- Web 与 Desktop 不共享 token，也不从浏览器 localStorage 自动迁移桌面 token。

## 12. 后端网络边界

- Electron 生产构建要求 `VITE_API_BASE_URL` 为绝对 HTTPS URL；空值、相对 `/api` 和 HTTP 均构建失败。
- HTTP/Zod contract、Bearer header、timeout、abort、envelope 和 401 事件继续由 `src/lib/http` 处理。
- 不把常规 API 代理到 Main，不用 IPC 绕过 CORS。
- 后端显式允许桌面 Renderer origin；不得通过关闭 `webSecurity` 解决 CORS。
- 后端允许的 Origin 以 packaged Spike 捕获的实际请求值为准，不凭假设硬编码；预检请求、Authorization header 和错误响应都纳入验证。
- 自签名证书只允许显式开发配置，生产不能忽略证书错误。
- Desktop 长驻场景重新评估 Query 刷新：保留全局 `refetchOnWindowFocus: false`，但消息等易变数据使用明确轮询或窗口激活时的定向 invalidation，不全局无差别刷新。

## 13. 文件、剪贴板与外链

### 13.1 下载

现有 `<a download>` 继续作为 Web 实现；Electron 使用 Main 下载管理器：

1. Renderer 提交受限的资源描述符和建议文件名，不提交任意目标路径或任意绝对 URL。
2. Main 从配置的 API base URL 构造同源下载地址；后端返回的预签名 URL 必须匹配批准 origin。
3. 同源 API 下载从 credential vault 读取 token；预签名或跨 origin 下载不附带 Authorization。使用 Electron `net` 流式下载，不把大文件 Buffer 经 IPC 往返。
4. 系统保存对话框确定目标路径。
5. Main 按任务 id 推送进度、完成、取消和错误事件。
6. 临时文件下载成功后原子移动到目标位置；失败或取消删除临时文件。

文件名做路径字符清洗；覆盖前由系统对话框确认。首期不做断点续传。

重定向策略是下载安全边界的一部分：

- 每一跳都重新校验协议和 origin，最多跟随 5 次。
- 同 origin 重定向可以保留 Authorization；一旦 origin 变化，必须删除 Authorization 且目标仍需命中批准列表。
- 禁止降级到 HTTP，拒绝 `file:`、`data:`、`javascript:` 和未知自定义协议。
- 重定向循环、缺失长度、磁盘空间不足和取消都进入可测试错误状态并清理临时文件。

### 13.2 当前文件模块边界

当前文件管理上传只登记名称、MIME 和大小，并不传真实文件 bytes。Electron 改造不能把它描述为真实上传；真实 multipart/预签名上传属于后端接入阶段。桌面首期只保证文件选择不退化、下载路径原生化。

### 13.3 分享与外链

- 不能再用 `window.location.origin` 生成分享链接，因为桌面 origin 是 `app://renderer`。
- 对外分享必须来自后端 HTTPS 地址或项目配置的 Web public base URL。
- Clipboard 只负责复制已经生成的安全字符串。
- `openExternal` 在 Main 二次校验协议和域名，拒绝任意 shell 目标。

## 14. 在线更新

### 14.1 工具与来源

- `electron-builder` 生成安装包、blockmap 和 `latest*.yml`。
- `electron-updater` 使用 `generic` provider。
- 更新服务器只是 HTTPS 静态文件托管，可落在 R2、S3、对象存储 CDN 或自建静态站点。
- 脚手架提供上传产物清单和目录协议，不保存云厂商密钥、不绑定供应商 SDK。
- 更新 feed 与二进制不使用业务用户 token；需要私有下载鉴权的更新服务不在首期 generic provider 范围内。

推荐目录：

```text
{baseUrl}/stable/darwin/arm64/latest-mac.yml
{baseUrl}/stable/darwin/arm64/<app>-<version>-arm64.zip
{baseUrl}/stable/darwin/arm64/<app>-<version>-arm64.dmg

{baseUrl}/stable/darwin/x64/latest-mac.yml
{baseUrl}/stable/darwin/x64/<app>-<version>-x64.zip
{baseUrl}/stable/darwin/x64/<app>-<version>-x64.dmg

{baseUrl}/stable/win32/x64/latest.yml
{baseUrl}/stable/win32/x64/<app>-Setup-<version>.exe
{baseUrl}/stable/win32/x64/<app>-Setup-<version>.exe.blockmap
```

每个构建只嵌入当前 platform/arch 的 feed URL。macOS 更新需要 ZIP 元数据，DMG 用于首次安装；Windows 使用 NSIS，首期不提供 MSI，因为 electron-updater 不负责 MSI 自动更新。

通用更新源必须满足以下 HTTP 契约：

- 只允许有效证书的 HTTPS；支持 `GET`/`HEAD`、`Content-Length`、正确 MIME 和 Range 请求，保证进度统计与 blockmap 差分能力可用。
- `latest*.yml` 使用 `Cache-Control: no-cache, no-store, must-revalidate` 或等价策略，并在发布后刷新 CDN metadata 缓存。
- 带版本号的 ZIP、DMG、EXE 和 blockmap 不可覆盖，可使用长期 immutable cache。
- 发布顺序固定为二进制 → blockmap → 完整性校验 → metadata；对象存储不假设 rename 原子性，以“metadata 最后可见”作为一致性边界。
- 部署后从公网 feed 回读 metadata、headers、文件长度和 hash；上传命令成功不等于发布成功。

`latest*.yml` 内的 sha512 只能证明下载内容与 metadata 一致，不能单独证明发布者身份；更新真实性最终依赖平台代码签名及固定 publisher/team identity。

### 14.2 更新状态机

Main 是更新状态的唯一 owner：

```text
idle
  → checking
  → upToDate
  → available
  → downloading
  → downloaded
  → installing

checking / downloading / installing
  → error

downloading
  → cancelled
```

每个状态包含稳定、可序列化的数据；Renderer 重新订阅时立即获得当前快照，不能只依赖瞬时事件。

状态快照还包含 `operationId`、`lastCommand`、`retryable` 和脱敏错误码。命令合法性固定如下：

| 命令              | 允许状态                                      | 约束                                               |
| ----------------- | --------------------------------------------- | -------------------------------------------------- |
| `check`           | `idle/upToDate/available/error/cancelled`     | single-flight；已有 checking 时复用同一 Promise    |
| `download`        | `available`                                   | 同一版本只允许一个下载任务                         |
| `cancelDownload`  | `downloading`                                 | 幂等；清理临时产物后进入 `cancelled`               |
| `install`         | `downloaded`                                  | 用户明确确认后执行；重复调用只接受第一次           |
| `retry`           | `error/cancelled` 且 `retryable=true`         | 根据 `lastCommand` 回到 check 或 download           |
| `getSnapshot`     | 任意状态                                      | 只读，不触发副作用                                 |

非法状态调用返回 typed domain error，不调用 `electron-updater`。Main 只注册一次 updater listener，应用退出时释放；窗口重建只重新订阅快照，不能重复绑定底层事件。

### 14.3 交互

- Shell 挂载并网络就绪后后台检查；检查过程不弹窗。
- Desktop Shell 新增宿主级 `UpdateStatus`，归 `src/app/shell/widgets`，不放业务模块或 `components/pro`。
- Header 只在发现版本、下载中、下载完成或失败时显示更新状态入口；点击后打开更新弹窗。
- Desktop 的用户菜单保留“检查更新”入口，允许用户主动检查；最新版本只给轻量成功反馈。
- 弹窗展示当前版本、目标版本、发布时间、更新说明和包大小。
- `autoDownload = false`；用户点击后才下载。
- 下载期间展示百分比、已传输/总大小和合理的速度信息。
- 下载完成后显示“重启并安装”；用户明确点击后调用安装。
- `autoInstallOnAppQuit = false`；普通退出不偷偷安装。
- 用户取消、断网或服务器错误不影响现有版本继续使用，并允许重试。
- Web 宿主不显示桌面更新入口。
- 更新文案进入 `common` i18n namespace，同时提供 `zh-CN` 与 `en-US`。

首期不做强制更新。协议保留 `channel` 与最低支持版本的未来扩展位，但 UI 和状态机不实现未启用逻辑。

### 14.4 版本与发布纪律

- `package.json.version` 是应用版本唯一真值。
- 构建脚本从 `package.json` 读取版本，同时注入 Renderer 常量并校验 `app.getVersion()`、electron-builder metadata 和 UI 展示值一致。
- 现有 `VITE_APP_VERSION` 被移除；过渡期若仍存在且与 `package.json.version` 不同，构建直接失败，禁止静默覆盖。
- 版本遵循 SemVer，更新源只接受比当前版本更高的稳定版本。
- 同一 appId/version 不允许覆盖已发布二进制；修复必须升版本。
- 发布前校验安装包 hash、metadata 引用、平台、架构和文件存在性。
- 更新源上传顺序：先二进制和 blockmap，最后发布并回读 `latest*.yml`，避免客户端看到未完整上传的版本。
- 更新日志不得包含 token、下载 header、证书内容或本地路径。

## 15. 打包、签名与派生配置

### 15.1 构建矩阵

| 平台    | 架构  | 首装产物 | 更新产物                      |
| ------- | ----- | -------- | ----------------------------- |
| macOS   | arm64 | DMG      | ZIP + `latest-mac.yml`        |
| macOS   | x64   | DMG      | ZIP + `latest-mac.yml`        |
| Windows | x64   | NSIS EXE | EXE + blockmap + `latest.yml` |

macOS 产物在 macOS 环境构建；Windows 产物在 Windows 环境构建。脚手架提供命令和文档，不假定单机交叉构建等价于真实平台验证。

### 15.2 派生项目必须配置

- appId、productName、可执行文件名和版权信息。
- macOS/Windows 图标。
- API base URL、Web public base URL、update base URL。
- macOS Developer ID、notarization 凭据。
- Windows publisher 与代码签名方式。
- 更新 release notes 和版本号。

配置 schema 在构建开始前校验；示例值不得伪装成可发布身份。

### 15.3 签名边界

- macOS 自动更新必须使用已签名应用；公开分发还需要 notarization。
- Windows 未签名安装包会产生信任与 SmartScreen 问题；真实项目应配置代码签名。
- 脚手架提交签名配置入口、identity/publisher 校验和文档，不提交证书、密码、token 或 CI secret；测试/正式 identity 从本地 Keychain、Windows certificate store 或 CI secret 注入。
- 未签名开发包只能作为开发证据，不能写成生产更新已验证。

### 15.4 验收证据分级

| 证据级别           | 可以证明                                                     | 不能证明                               |
| ------------------ | ------------------------------------------------------------ | -------------------------------------- |
| 开发/自动化证据    | Main/Preload/Renderer 契约、状态机、feed、metadata、UI 联动 | OS 信任、正式签名、公证、SmartScreen   |
| 未签名安装包 smoke | 当前平台安装、启动、卸载和基础窗口行为                       | macOS 自动更新和生产发布可信度         |
| 测试签名更新证据   | 指定平台旧版到新版更新链路                                   | 正式 publisher 的公开分发信誉          |
| 正式发布验收       | 正式签名、公证/publisher、生产 feed、真实平台升级            | 不自动外推到未执行的其他 platform/arch |

平台证据按 `macOS arm64 / macOS x64 / Windows x64` 分行记录 build、install、backend、update、uninstall 和签名状态。未经单独授权修改 CI/CD 时，当前机器无法执行的平台保持“待平台验证”，不能用交叉构建或 Mock 标记为通过。

## 16. 生命周期与错误处理

### 16.1 生命周期

- 使用 `requestSingleInstanceLock`；第二次启动聚焦现有窗口。
- macOS 关闭最后窗口后应用保持可激活，Dock 点击重新创建窗口。
- Windows 关闭最后窗口退出应用。
- 首期不最小化到托盘，不改变用户对关闭按钮的预期。
- 退出前取消未完成的非安装临时下载并清理临时文件。

### 16.2 错误分层

- Main 启动失败：展示原生错误对话框并安全退出。
- Renderer 加载失败：展示本地恢复页，提供重载和日志目录入口。
- Preload/IPC contract 失败：拒绝调用，记录 channel 与 schema issue，不记录敏感 payload。
- 安全存储失败：按无会话启动；登录后的 persist 失败必须阻止“假成功登录”。
- 更新失败：现有版本继续可用，UI 提供错误摘要和重试。
- 下载失败：删除临时文件，保留目标目录原文件。

首期不实现自动降级或静默回滚。调用 `quitAndInstall` 前写入不含敏感信息的 pending-update marker；新版本在 Main ready、Renderer 加载和基础健康检查完成后清除。marker 长期未清除时记录可诊断错误并展示恢复说明，但不自动运行旧二进制。更新源保留上一稳定版本产物和人工重装说明，便于故障恢复。

日志写入 `userData/logs`，按大小轮转；生产默认不输出 token、Authorization、完整用户数据和任意下载 URL query。

## 17. TDD、守卫与验证

### 17.1 RED → GREEN 顺序

1. 先加模块边界守卫，证明 Electron import、裸 `window.desktop` 和任意 IPC 会失败。
2. 先写共享 Renderer Vite factory、outDir、Mock 剥离和版本一致性测试，再接 Web/Desktop 配置。
3. 先写 desktop config/schema 测试，再实现构建参数解析。
4. 先写更新纯状态机的合法命令、single-flight、重试和 listener 生命周期测试，再接 `electron-updater` 事件。
5. 先写 credential vault 与 `SessionCredentialService` 的失败、refresh、清理和双真值防漂移测试，再接 `safeStorage`。
6. 先写 navigation、redirect chain、URL allowlist、sender 校验测试，再注册 BrowserWindow handler。
7. 先写 Web platform 回归测试，确认桌面适配不破坏现有下载、clipboard 和 auth。
8. 先写 integrated 三布局安全区与 drag/no-drag DOM 契约测试，再修改 Shell。
9. 先写更新源 headers/cache/metadata 回读校验，再实现发布脚本。

任何新增测试第一次即通过都要检查断言是否只是覆盖现有行为。

### 17.2 自动化层次

- Vitest/jsdom：Renderer adapter、Shell 安全区、更新 UI 和 Web fallback。
- Vitest/node：共享构建配置、版本一致性、schema、redirect/URL allowlist、更新状态机、更新源契约和文件名清洗。
- Electron 集成测试：Main/Preload IPC、sender 校验、安全存储适配和窗口模式。
- Playwright Electron：启动、登录、路由、两种 chrome、更新 UI 状态和 Renderer/Main 联动。Playwright Electron 支持仍标记 experimental，因此只作为 E2E 层，不替代纯逻辑测试和安装包 smoke。
- Agent Browser：继续负责 Web 宿主和现有视觉矩阵；不能用 Web Browser 截图冒充 Electron packaged 验证。
- 真实平台 smoke：按证据矩阵记录 macOS arm64、macOS x64、Windows x64 的安装、启动、升级和卸载；未执行的平台明确保持 pending。

原生保存对话框在 Playwright 中通过 Main stub 做确定性自动化；另保留真实 OS 人工 smoke，不能把 stub 结果写成原生对话框已真实点击。

### 17.3 完成门禁

现有门禁全部保留：

```bash
./node_modules/.bin/tsc -b --noEmit
./node_modules/.bin/eslint src
./node_modules/.bin/vitest run
pnpm theme:guard
pnpm design:lint
pnpm build
```

新增门禁：

```bash
pnpm test:desktop
pnpm build:web
pnpm build:desktop -- --window-chrome=native
pnpm build:desktop -- --window-chrome=integrated
pnpm make:desktop -- --window-chrome=native
pnpm make:desktop -- --window-chrome=integrated
```

还必须断言：

- Web 生产包无 `electron`、`electron-updater`、Node built-in 和桌面 preload 代码。
- Electron 生产包无 `faker`、`msw`、`mockServiceWorker`。
- Electron Renderer 无 Node integration、无任意 IPC；`script-src` 无 `unsafe-inline/unsafe-eval`，style inline 权限只存在于明确的 `style-src-attr`。
- release 产物实际 fuse wire 与 §9 profile 一致。
- 两种窗口模式的三套 Shell 在 90%/100%/108% 下无窗口按钮/Header/导航重叠和横向溢出。
- 更新 metadata 的路径、hash、platform、arch 和实际文件一致。
- 更新源 metadata cache、二进制 immutable、Content-Length/Range 和公网回读契约通过。
- 产物未包含 `.env`、证书、token、测试快照和 `.superpowers/`。

脚手架更新闭环至少在一个具备有效更新条件的平台执行“已安装旧版本 → 发布更高测试版本 → 检查 → 下载 → 重启安装 → `app.getVersion()`/UI 版本回读”；其他平台可先保留自动化与 metadata 证据，但必须标为 pending。macOS 未注入签名 identity 时不能执行或声称真实更新通过。派生产品正式发布前，三个平台/架构都必须分别完成签名更新闭环，不能只 mock `update-available`。

## 18. 文档同步

代码落地时同步更新：

| 文档                   | 内容                                                   |
| ---------------------- | ------------------------------------------------------ |
| `docs/architecture.md` | 双宿主总图、Main/Preload/Platform 边界、配置与依赖方向 |
| `AGENTS.md`            | Electron 禁止项、IPC/schema 规则、双宿主完成门禁       |
| `README.md`            | Web/Desktop 快速开始、窗口模式、构建命令               |
| `docs/desktop.md`      | 派生配置、构建矩阵、更新源、签名、公证、发布与排障     |
| 本设计文档             | 记录范围、取舍和为什么这样设计                         |

`docs/architecture.md` 只有在代码实现并验证后才能改写为“当前已支持”；实施过程中不得提前把未来态写成当前事实。

## 19. 实施分期与提交边界

当前 `main` 有大规模未提交纵切迁移。Electron 实施前必须先形成干净 checkpoint；若需要并行，使用独立 worktree 和 `codex/electron-dual-host` 分支，不能把当前脏区带入 Electron 提交。

建议分期：

0. **Packaged Spike**：最小 Main/Preload/Renderer、自定义协议、静态资源、hash history、真实 API CORS、CSP 和 401 链路；不通过不扩展功能。
1. **宿主骨架**：共享 Renderer Vite factory、electron-vite、Main/Preload、安全窗口、Web 回归。
2. **平台边界**：platform adapter、typed IPC、守卫、clipboard/external。
3. **鉴权**：`SessionCredentialService`、内存 auth store、Web credential adapter、safeStorage vault、启动恢复。
4. **窗口 chrome**：`native`、`integrated`、三布局安全区消费者、三比例验证。
5. **文件能力**：原生保存、下载进度、redirect 安全、临时文件和分享链接修正。
6. **更新能力**：命令状态机、Header 入口、弹窗、generic provider、更新源 HTTP 契约。
7. **打包发布**：fuses、DMG/ZIP、NSIS、签名注入、metadata 校验和平台证据矩阵。
8. **文档收口**：architecture、AGENTS、README、desktop 运维文档。

每个阶段单独提交，中文 commit message；代码、验证证据和文档尽量分开。未经确认不修改 CI/CD，不执行 push。

## 20. 完成定义

### 20.1 脚手架完成

只有同时满足以下条件，才能声明仓库具备 Electron 双宿主脚手架能力：

1. Packaged Spike 的协议、资源、hash history、真实 HTTPS API/CORS、CSP 和 401 链路通过。
2. 同一 `src/` 能稳定构建 Web 与 Electron，业务模块没有 Electron 依赖，共享 Renderer 配置无漂移。
3. Web 现有登录、路由、主题、Mock 剥离和业务测试不退化。
4. `native` 与 `integrated` 均可通过构建参数选择，三套 Shell 正确消费窗口安全区，Web 不受影响。
5. token 在 Electron 不落明文 localStorage，统一会话服务保证启动恢复、refresh、登出和 401 清理不产生双真值。
6. 文件下载使用原生保存位置，具备进度、取消、redirect 安全和失败清理。
7. generic feed、更新状态机、HTTP/CDN 契约和 metadata 校验通过，并至少有一个满足签名前提的平台完成真实旧版到新版安装闭环。
8. CSP、sandbox、context isolation、fuses、导航限制、sender 校验和 IPC schema 门禁通过。
9. 现有门禁、桌面门禁、Web visual、Electron E2E 和当前可用平台 smoke 有证据；不可用平台明确标为 pending。
10. `docs/architecture.md`、`AGENTS.md`、`README.md`、`docs/desktop.md` 与代码一致。
11. 当前工作区既有改动未被覆盖，Electron 提交可独立回滚。

### 20.2 派生产品发布验收

派生项目要声明“可向真实用户发布”，还必须额外满足：

1. macOS arm64、macOS x64、Windows x64 分别在真实目标环境完成安装、远程后端连接、升级和卸载。
2. macOS 使用固定 Developer ID 完成签名与 notarization；Windows 使用固定 publisher 完成代码签名。
3. 三个平台/架构分别从已安装旧版本经生产候选 feed 更新到新版本，并回读签名身份与应用版本。
4. 生产 API CORS、Web public base URL、update base URL、metadata cache 和 CDN 回读已验证。
5. 平台证据矩阵没有 pending；未完成项不能由交叉构建、Mock 或其他平台结果替代。

## 21. 主要风险与处理

| 风险                            | 处理                                                            |
| ------------------------------- | --------------------------------------------------------------- |
| Electron 代码侵入业务层         | platform adapter + import guard + typed preload                 |
| Web/Desktop Vite 配置漂移       | 单一 Renderer 配置工厂 + outDir 参数化 + 双构建门禁             |
| custom protocol 下路由/CORS 异常 | Phase 0 packaged Spike + 标准安全 scheme + hash history         |
| 三套 Shell 与窗口按钮重叠       | 每布局明确安全区消费者 + 三比例/窄屏矩阵                         |
| CSP 与现有动态样式冲突          | script/style 指令分离；只保留受限 `style-src-attr`               |
| Renderer/Main token 双真值      | `SessionCredentialService` + 直接 setToken 守卫                  |
| 下载重定向泄露 Authorization    | 每跳校验 origin + 跨域去 header + 限制跳数                       |
| 更新元数据先于二进制发布        | 二进制先上传，metadata 最后可见并从公网回读                      |
| CDN 缓存旧 metadata             | metadata no-cache + versioned artifact immutable + CDN 刷新      |
| unsigned build 被误写成生产可用 | 脚手架完成与派生产品发布验收分级                                 |
| generic feed 被任意 URL 劫持    | HTTPS、构建期固定 base、平台签名、禁止 Renderer 修改 feed       |
| 更新命令并发或重复 listener     | Main 单 owner + single-flight + 合法命令表 + listener 生命周期   |
| Playwright Electron 实验性      | 纯逻辑测试 + IPC 集成 + packaged smoke 三层兜底                 |
| 当前脏工作区混入桌面改造        | 先 checkpoint；并行时独立 worktree/branch                       |

## 22. 官方资料

- Electron 进程模型：<https://www.electronjs.org/docs/latest/tutorial/process-model>
- Electron Context Isolation：<https://www.electronjs.org/docs/latest/tutorial/context-isolation>
- Electron 安全清单：<https://www.electronjs.org/docs/latest/tutorial/security>
- Electron 自定义协议：<https://www.electronjs.org/docs/latest/api/protocol/>
- Electron safeStorage：<https://www.electronjs.org/docs/latest/api/safe-storage>
- Electron Code Signing：<https://www.electronjs.org/docs/latest/tutorial/code-signing>
- electron-vite：<https://electron-vite.org/guide/>
- electron-vite 生产构建：<https://electron-vite.org/guide/build>
- electron-builder Auto Update：<https://www.electron.build/docs/features/auto-update/>
- electron-builder Publish：<https://www.electron.build/docs/publish/>
- electron-builder Target Selection：<https://www.electron.build/docs/targets/>
- Playwright Electron：<https://playwright.dev/docs/api/class-electron>
