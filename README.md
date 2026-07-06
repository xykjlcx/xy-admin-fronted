# 通用后台管理脚手架

Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui + TanStack(Router / Query / Table) 的企业后台管理模板。

**定位**：让基于它启动的每个项目（外包 / 自有产品 / 内部系统）把「壳」（布局、主题、导航、鉴权、请求、国际化）的成本压到接近零，把精力投入具体业务。

## 快速开始

环境：Node 24 · pnpm 11.7+

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
pnpm design:lint    # 三套 flavor 的 DESIGN.md 校验
```

## 文档地图（先读这几份）

| 文档 | 定位 | 何时读 |
|---|---|---|
| `AGENTS.md`（`CLAUDE.md` 是它的软链接） | **AI / 人的执行铁律速查**，单一真相源 | 动手前必读 |
| `docs/architecture.md` | **工程架构真相源**（分层 / 数据流 / 缓存 / token / 守卫） | 理解「为什么这样组织」 |
| `docs/NEW-PROJECT.md` | **基于本脚手架启动新项目的清单** | 派生新项目时 |
| `docs/design/*.design.md` | 三套 flavor（飞书 / Claude / shadcn）的设计身份与 token 值 | 改主题 / 加 flavor |
| `docs/superpowers/specs/` | 历史设计草案与施工图 | 追溯某个决策的来龙去脉 |
| `docs/prototype-handoff.md` | 最初的原型交接稿（历史存档，含未实现范围） | 追溯原型完整设计意图 |

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
├── lib/         http(client / contract) / i18n / permission / icon-registry
├── stores/      zustand：auth(token) / appearance
└── locales/  mocks/  styles/
```

> 新业务复制 `modules/admin/users/` 的纵切结构（唯一范本）。`modules/admin/pages/{roles,menus,dashboard}` 是待迁移的横切遗留，勿模仿。

## 当前交付

后台管理骨架、三布局 Shell（sidebar / rail / inset）、外观与 token 体系（三 flavor × 明暗 × 显示比例 × 圆角）、鉴权 / 权限守卫、`admin` 子系统与「成员与部门」纵切切片、角色与菜单页。版本演进见 `CHANGELOG.md`。

> 前端权限只负责体验与防误触，**不是安全边界**；生产权限必须由后端校验。
