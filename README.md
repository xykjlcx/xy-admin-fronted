# 通用后台管理脚手架

Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui + TanStack(Router / Query / Table) 的企业后台管理模板，同一套业务代码可交付 Web 与 Electron。

**定位**：让基于它启动的每个项目（外包 / 自有产品 / 内部系统）把「壳」（布局、主题、导航、鉴权、请求、国际化）的成本压到接近零，把精力投入具体业务。

## 快速开始

环境：Node `^20.19.0 || >=22.12.0`（推荐 Node 24）· pnpm 11.7+

```bash
pnpm install
pnpm dev            # 开发态默认启用 mock，无需真后端
```

构建与校验：

```bash
pnpm build          # tsc -b && vite build（生产包自动剥离 faker/msw/mock worker）
pnpm test           # vitest
pnpm lint           # eslint src
pnpm theme:guard    # 主题 token 门禁（token 快照 / 违规 class / 状态矩阵）
pnpm design:lint    # 多套 flavor 的 DESIGN.md 校验
```

Desktop 开发与打包：

```bash
pnpm dev:desktop

# 生产构建需先注入三个无凭据 HTTPS URL
export VITE_API_BASE_URL=https://api.your-domain.invalid
export VITE_WEB_PUBLIC_BASE_URL=https://app.your-domain.invalid
export DESKTOP_UPDATE_BASE_URL=https://updates.your-domain.invalid

pnpm build:desktop -- --window-chrome=native
pnpm build:desktop -- --window-chrome=integrated
pnpm make:desktop -- --window-chrome=native
pnpm make:desktop -- --window-chrome=integrated
```

`native` 使用系统标题栏；`integrated` 把内容延伸进标题栏，macOS 红黄绿按钮/窗口安全区由 Shell 自动消费。发布身份、签名、generic update feed 和产物目录见 `docs/desktop.md`。

## 文档地图（先读这几份）

| 文档                                    | 定位                                                      | 何时读                 |
| --------------------------------------- | --------------------------------------------------------- | ---------------------- |
| `AGENTS.md`（`CLAUDE.md` 是它的软链接） | **AI / 人的执行铁律速查**，单一真相源                     | 动手前必读             |
| `docs/architecture.md`                  | **工程架构真相源**（分层 / 数据流 / 缓存 / token / 守卫） | 理解「为什么这样组织」 |
| `docs/desktop.md`                       | **Electron 派生、打包、签名、更新与排障手册**             | 开发/发布桌面端时      |
| `docs/NEW-PROJECT.md`                   | **基于本脚手架启动新项目的清单**                          | 派生新项目时           |
| `docs/design/*.design.md`               | 多套 flavor 的设计身份与 token 值                         | 改主题 / 加 flavor     |
| `docs/superpowers/specs/`               | 历史设计草案与施工图                                      | 追溯某个决策的来龙去脉 |
| `docs/prototype-handoff.md`             | 最初的原型交接稿（历史存档，含未实现范围）                | 追溯原型完整设计意图   |

> 冲突时优先级：**当前代码 > `docs/architecture.md` > `AGENTS.md` > 历史 plan / spec**。

## 一句话架构

**样式向下收敛，数据向下请求，状态就近安放，一致性交给缓存。**

- **样式收敛**：视觉固化在 `components/ui`（原语）+ `components/pro`（通用组件），业务层只写布局类。
- **数据下沉**：服务端数据全归 TanStack Query，「谁消费谁 `useQuery`」，靠 query key 复用缓存。
- **状态就近**：UI 状态住在「所有消费它的组件的最近公共父」，不无脑上提 / 下沉。
- **一致性靠缓存**：跨组件同步经 `invalidateQueries`，不 prop drilling。

## 目录总览

```text
src/
├── app/         全局装配：providers / QueryClient / Shell / mount
├── config/      启动策略与默认值：env(唯一读 import.meta.env) / app / features / request / appearance
├── routes/      文件式路由「薄壳」：URL / validateSearch / staticData / loader
├── modules/<key>/<business>/   业务纵切包（api / mocks / list / detail / form）
├── components/{ui,pro}         shadcn 原语 / 后台通用业务无关组件
├── lib/         http / i18n / permission / platform 宿主门面 / icon-registry
├── stores/      zustand：auth(token) / appearance
└── locales/  mocks/  styles/
```

```text
electron/        Main / Preload / shared IPC schema / 本地恢复页
desktop.config.ts          派生项目桌面身份与开发默认值
electron-builder.ts        DMG / ZIP / NSIS / 签名 / update metadata
vite.renderer.config.ts    Web/Desktop 共享 Renderer 构建真值
vite.desktop.config.ts     Vite 8 + vite-plugin-electron 的 Desktop 构建入口
```

> 新业务复制 `modules/admin/users/` 的纵切结构（唯一范本）。`modules/admin/pages/{roles,menus,dashboard}` 是待迁移的横切遗留，勿模仿。

## 当前交付

后台管理骨架、三布局 Shell（sidebar / rail / inset）、外观与 token 体系（多 flavor × 明暗 × 显示比例 × 圆角）、鉴权 / 权限守卫、`admin` 子系统与「成员与部门」纵切切片、角色与菜单页；Web/Electron 双宿主、native/integrated 窗口模式、安全凭据、原生下载与在线更新骨架已落地。版本演进见 `CHANGELOG.md`。

> 前端权限只负责体验与防误触，**不是安全边界**；生产权限必须由后端校验。
