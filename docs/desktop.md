# Electron 桌面宿主手册

本仓库当前支持同一份 `src/` 构建 Web 与 Electron。Electron 是联网客户端，继续连接远程 HTTPS 后端，不引入 SQLite 或离线业务数据库。

## 1. 交付模型

- Web：Vite browser Renderer，browser history，浏览器 credential adapter。
- Desktop：Electron Main + sandboxed Preload + 同一 React Renderer，hash history，`app://renderer` 安全协议。
- 业务宿主能力：统一经 `src/lib/platform` 使用 clipboard、external URL、credential、download、window state 和 updater。
- 后端：Web 由 Renderer 请求；Desktop 常规 API 同样由 Renderer 请求，需要安全 token/原生流式文件的能力由 Main 执行。

Desktop 提供两种构建时窗口模式：

| 模式         | 效果                                                                      |
| ------------ | ------------------------------------------------------------------------- |
| `native`     | 完整保留 macOS/Windows 系统标题栏，应用从内容区开始                       |
| `integrated` | 内容延伸进标题栏；macOS 使用 hidden inset，Windows 使用 title bar overlay |

两种模式共享三套 Shell。安全区由 Main/Preload 投影为 CSS token，Shell 不写 Electron 分支。

## 2. 环境与命令

要求 Node 24 与 pnpm 11.7+。

```bash
pnpm install
pnpm dev:desktop
```

开发命令默认使用 `desktop.config.ts` 的 localhost 开发值。生产 `build/make` 必须注入：

| 变量                               | 要求                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `VITE_API_BASE_URL`                | 远程 API 绝对 HTTPS URL，可带 API path prefix                            |
| `VITE_WEB_PUBLIC_BASE_URL`         | 公开 Web 站点 HTTPS URL，用于分享链接                                    |
| `DESKTOP_UPDATE_BASE_URL`          | generic feed 的 HTTPS 根路径；运行时自动追加 `stable/{platform}/{arch}/` |
| `DESKTOP_DOWNLOAD_ALLOWED_ORIGINS` | 可选；逗号分隔的预签名下载 HTTPS origin，只允许默认 443 端口             |

```bash
export VITE_API_BASE_URL=https://<api-host>/<optional-prefix>
export VITE_WEB_PUBLIC_BASE_URL=https://<web-host>
export DESKTOP_UPDATE_BASE_URL=https://<update-host>/<application-channel>

pnpm build:desktop -- --window-chrome=native
pnpm build:desktop -- --window-chrome=integrated
pnpm make:desktop -- --window-chrome=native
pnpm make:desktop -- --window-chrome=integrated
```

尖括号是必须替换的占位符，不是可发布身份或真实域名。

`build:desktop` 生成 `out/main`、`out/preload`、`out/renderer`。`make:desktop` 在当前平台构建安装包：

```text
release/<native|integrated>/
├── darwin-arm64/       # macOS 上生成 DMG + ZIP + metadata
├── darwin-x64/
├── win32-x64/         # Windows 上生成 NSIS + metadata
└── feed/stable/<platform>/<arch>/
```

macOS 构建不能代替 Windows 的真实打包/安装/更新证据，反之亦然。

## 3. 派生项目必改配置

`desktop.config.ts` 的当前值是显式不可发布的脚手架开发身份。派生项目需要替换：

1. `appId`：组织控制的稳定反向域名，发布后不随意修改。
2. `productName` 和 `executableName`：面向用户的产品名与稳定的 kebab-case 可执行文件名。
3. `copyright`：真实版权主体。
4. `macTeamId`：Apple Developer Team ID；不发 macOS 也可保持 `null`。
5. `windowsPublisher`：Windows 签名证书 subject 中的固定 publisher；不发 Windows 也可保持 `null`。
6. 全部真实身份配好后才将 `releaseIdentityConfigured` 设为 `true`。
7. 用产品图标替换 `build/icon.png`（1024 × 1024 PNG）。

`package.json.version` 是 Main、Renderer、安装包和 update metadata 的唯一版本真值，必须是稳定 SemVer。禁止恢复 `VITE_APP_VERSION` 双真值；过渡环境若仍提供该变量，值不一致时构建会失败。

## 4. 两种窗口模式的发布决策

`native` 和 `integrated` 是同一个产品的两种构建选择，不是两个并行更新变体。一次发布必须选定其中一种：

- 同一 `appId + version + update base` 下，禁止把两种模式的 metadata 上传到同一 feed，后上传者会改变用户获得的二进制。
- 本地产物按 `release/native` 和 `release/integrated` 分开，是为了比较和验收，不代表应同时发布。
- 若业务确实要把两种外观作为两个产品，必须给它们不同的 `appId/productName/update base`，并分别完成签名更新验收。

## 5. 更新源与发布顺序

Main 使用 `electron-updater` generic provider，禁止 Renderer 修改 feed URL。用户在 Header 或更新弹窗内完成检查、下载、取消/重试、重启安装。`quitAndInstall` 之前会写入无敏感信息的 pending marker，新进程首次 Renderer 健康后清除。

上传顺序必须是：

1. 带版本号的安装包、更新包与 blockmap。
2. 从公网 URL 回读并确认二进制可用。
3. 最后上传 `latest-mac.yml` 或 `latest.yml`。
4. 从公网再次执行回读验证。

HTTP/CDN 契约：

| 资源       | 必要响应                                                                           |
| ---------- | ---------------------------------------------------------------------------------- |
| metadata   | GET/HEAD 200；YAML MIME；正确 Content-Length；`no-cache, no-store`                 |
| 版本化产物 | HEAD 200；非 HTML MIME；Content-Length；`immutable` 长缓存；`Accept-Ranges: bytes` |
| Range 请求 | `bytes=0-0` 返回 206、1 byte 与正确 Content-Range                                  |

公网回读：

```bash
pnpm verify:update-feed -- \
  --feed-url=https://<update-host>/<application-channel>/stable/darwin/arm64/ \
  --metadata=latest-mac.yml
```

该命令会完整下载 metadata 指向的更新产物，回读 byte length 和 SHA-512。

## 6. 签名与正式构建

仓库不提交证书、密码、token 或 `.env`。下列变量只能由本地安全存储或发布环境注入。

### macOS

1. 在 `desktop.config.ts` 写入真实 Team ID 和发布身份。
2. 注入 `DESKTOP_RELEASE_BUILD=true`、`CSC_NAME`、`APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`。
3. 执行所选窗口模式的 `make:desktop`。
4. 构建前会校验身份，产物阶段回读 Developer ID Team ID、notarization 入口、ASAR integrity 和 fuse wire。

### Windows

1. 在 `desktop.config.ts` 写入证书 publisher。
2. 注入 `DESKTOP_RELEASE_BUILD=true`、`CSC_LINK`、`CSC_KEY_PASSWORD`。
3. 在 Windows x64 机器上执行所选窗口模式的 `make:desktop`。
4. 产物验证使用 PowerShell 回读 Authenticode `Valid` 与固定 publisher subject。

未签名/ad-hoc 包只能作开发和当前平台安装 smoke。macOS 没有有效 Developer ID 时，不得宣称真实自动更新通过；Windows 交叉构建也不能代替 Windows 安装、SmartScreen 和更新验收。

## 7. 安全与产物门禁

正常 `make` 产物在 `afterPack` 阶段翻转 Electron fuse，并立即回读。Playwright packaged Spike 使用未翻转的隔离开发包，因为 Playwright Electron driver 依赖调试入口；该例外不影响正常安装包。

```bash
pnpm guard:desktop
pnpm typecheck:desktop
pnpm test:desktop
pnpm build:web
pnpm build:desktop -- --window-chrome=native
pnpm build:desktop -- --window-chrome=integrated
pnpm make:desktop -- --window-chrome=native
pnpm make:desktop -- --window-chrome=integrated
```

`make` 之后的自动验证覆盖：

- ASAR 只包含编译产物与 `package.json`，无 `node_modules`、`.env`、证书、测试、快照、`.superpowers`。
- Main/Preload/Renderer/恢复页存在，版本和 Main 入口一致，ASAR 体积不超过守卫上限。
- CSP 不允许 script inline/eval；BrowserWindow 保持 sandbox/context isolation/web security；Main 实读所有 fuse。
- metadata path/version/platform/arch/size/SHA-512 与真实产物一致，二进制/blockmap 在 metadata 前进入本地 feed。

## 8. 运行时行为与排障

- 单实例：第二次启动聚焦已有窗口。macOS 关闭最后窗口后保持可激活；Windows 关闭最后窗口后退出。
- 安全凭据：密文位于 `userData/credentials/session.bin`。无密文的首次启动不访问系统密钥库；密文损坏或安全存储不可用时按无会话启动。
- 退出：先取消非安装下载、等待 `.part` 文件清理，再退出。
- Renderer 加载失败：进入本地恢复页，可重载主应用或打开日志目录。
- 日志：`userData/logs/main.log`，默认按 1 MiB 轮转 3 份。不记录 IPC payload、Authorization/token 或 URL query。
- 更新 marker：`userData/updates/pending.json`。新进程首次健康加载后清除；长期存在表示上次更新未完成健康确认，首期不自动回滚。

常见失败：

| 现象                                    | 检查                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| 生产 build 拒绝 HTTP/相对 URL           | 三个生产 URL 必须是无凭据 HTTPS 绝对 URL                                                   |
| 正式 build 提示身份未配置               | 占位身份不可发布；先改 `desktop.config.ts`，再注入签名变量                                 |
| 更新检查返回旧 metadata                 | metadata 必须 no-cache/no-store，同时清理 CDN 旧对象                                       |
| 更新包下载失败                          | 执行 `verify:update-feed`，检查 Range、Content-Length、MIME 和 SHA-512                     |
| packaged 启动立即失败且提示 V8 snapshot | release fuse 的 browser-specific V8 snapshot 必须保持与产物能力一致；当前 profile 显式关闭 |
| 首次启动停在 Keychain                   | 确认使用当前 credential vault；无密文时不应调用 `safeStorage`                              |

## 9. 验收证据级别

| 证据               | 可以证明                           | 不能证明                      |
| ------------------ | ---------------------------------- | ----------------------------- |
| 单测/packaged E2E  | 契约、状态机、宿主联动、开发 feed  | OS 信任、真实签名更新         |
| 未签名安装包 smoke | 当前平台安装、启动、基本窗口、卸载 | 公证、SmartScreen、生产更新   |
| 测试签名旧版→新版  | 该 platform/arch 的真实更新链路    | 其他平台或正式 publisher 声誉 |
| 正式发布验收       | 固定签名身份、生产 feed、真实升级  | 未执行的其他平台              |

验收报告必须按 macOS arm64、macOS x64、Windows x64 分别记录 build/install/backend/update/uninstall/signing；当前机器不可用的项保持 `pending`，不用交叉构建、stub 或其他平台结果代替。
