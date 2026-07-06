# 基于本脚手架启动新项目

本脚手架的目标是让新项目的「壳」成本 ≈ 0。启动一个新项目 = 取最新版本 + 按下面清单实例化。全程约半小时。

## 0. 取用最新版本

```bash
git clone <scaffold-repo> my-project && cd my-project
git checkout <latest-tag>          # 见 git tag -l 与 CHANGELOG.md，从最新里程碑起步
```

- **外包项目**（交付后不再吃脚手架更新）：`rm -rf .git && git init` 断开历史，之后各活各的。起步新鲜度就是全部——业界完整仓库型模板的常态是 clone-and-diverge。
- **长期自有产品**（要持续吃脚手架改进）：保留脚手架为 remote（`git remote add scaffold <url>`），约定**浅分叉 + 常 merge**（`git merge scaffold/<tag>`）。分叉越深冲突越大，所以要勤 merge。

> 没有任何机制能同时给你「完整可运行仓库 + 派生随意改 + 持续无痛回流」。外包走前者，自有产品走后者。

## 1. 改身份

- `package.json`：`name`、`version` 重置为 `0.1.0`
- `index.html`：`<title>`、`<meta name="m0-app-id">`
- `src/config/app.ts`：`id`、`routes`（若默认落地页 / 登录路径不同）
- `.env.development` / `.env.production` / `.env.demo`：`VITE_APP_ENV`、`VITE_API_BASE_URL`、`VITE_DEFAULT_LOCALE`
- 品牌：`public/favicon.svg`、主题色（`src/styles/tokens.css` 的 accent、`src/config/appearance.ts` 默认）

## 2. 删示例业务与假数据

**保留（脚手架核心，不动）**：`src/app/`、`config/`、`lib/`、`components/`、`stores/`、`styles/`、`routes/__root.tsx`、`routes/_auth.tsx`、`routes/login.tsx`、`routes/403.tsx`。

**替换 / 删除（示例业务）**：
- `src/modules/admin/`：内核子系统。保留 auth / menu 基础设施与 Shell 依赖；`users` / `roles` / `menus` / `dashboard` 是示例页，按项目替换成真实业务。
- mock 假数据：`src/modules/**/mocks/`、`src/mocks/db.ts` 里的假用户 / 部门（含中文假人名、假手机号）——**交付前必须换成项目数据或删除**。
- `dashboard` 的假指标数据。

## 3. 删原型资产（不让它随派生项目扩散）

```bash
git rm 后台管理脚手架.dc.html support.js
git rm -r docs/design/research docs/baselines docs/日志
git rm docs/prototype-handoff.md
```

> 这些是本脚手架的开发产物（原型稿、采集档案、执行日志），不是新项目的资产。

## 4. 重置演进记录

- `CHANGELOG.md`：清空为新项目的 `0.1.0`
- `docs/superpowers/`：脚手架的历史 spec / plan，新项目按需清理
- `docs/superpowers/specs/2026-07-02-*`：原型设计草案，删除

## 5. 新增第一个业务子系统

见 `AGENTS.md`「子系统增删清单」——复制 `modules/admin/users/` 纵切结构，不发明第二种目录形态。

## 验证（跑到业务可用终态）

```bash
pnpm install && pnpm dev     # 能起、能登录、mock 通
pnpm build                   # 构建通过
grep -R -E "faker|msw|mockServiceWorker" dist && echo "❌ mock 未剥离" || echo "✅ mock 已剥离"
```
