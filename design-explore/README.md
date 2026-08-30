# design-explore —— 脚手架视觉重设计探索

> 最后更新：2026-08-25
> 在线画布：https://claude.ai/code/artifact/aac29e03-87f9-4843-95f3-e673eb8733fd
> 本目录 **未纳入 git**（`git status` 显示 `?? design-explore/`），7.1M / 66 个文件，只在本地磁盘。

## 这是什么

给「通用脚手架前端」做视觉重设计的探索画布：**60 张 1440×850 的设计稿**，
同一个「成员与部门」业务场景，用不同设计体系/页型重画，用于回答
「怎么做得有设计感、又符合 SaaS 规范、还能多主题切换」。

每张顶部有 72px 深色说明条（banner），六个字段：
`方向编号 | 体系名 | 出处 | 密度 | 规范(一眼认出的特征) | 代价(诚实的缺点)`

## 画布结构（4 页 60 张）

| 页 | 张数 | 内容 |
|---|---|---|
| 设计体系 | 41 | 7 行分组，见下 |
| 视觉手法 | 4 | Main / WarmEditorial / CommandDeck / SoftDepth |
| 交互形态（暂缓） | 3 | SplitFlow / AICopilot / CommandFirst（洋哥说意义不大，归档不删） |
| **页型探索** | 12 | **矩阵排布：列 = 体系，行 = 页型** |

### 设计体系 41 张的 7 行

| 行 | 主题 | 张数 | 成员 |
|---|---|---|---|
| 1 | 国际企业级 | 6 | Fluent / IBM Carbon / SAP Fiori / Salesforce / Atlassian / GitHub Primer |
| 2 | 中国互联网 | 6 | Ant Design 5 / Arco / Semi / TDesign / Element Plus / 小红书 |
| 3 | 现代消费级 | 6 | Material 3 / Polaris / Stripe / Windows 11 / Base Web / HarmonyOS |
| 4 | 高密度专业工具 | 5 | DataGrid / Bloomberg / Adobe Spectrum / Grafana / Terminal TUI |
| 5 | 实验性流派 | 5 | NeoBrutalism / Glassmorphism / Neumorphism / Apple HIG / Oracle Redwood |
| 6 | **骨架级差异**（新） | 5 | Azure Portal / AWS Cloudscape / Odoo / Figma UI3 / VS Code |
| 7 | **气质级差异**（新） | 8 | Linear / GitLab Pajamas / GOV.UK / デジタル庁 / Toss / 抖音 / 飞书 / 阿里云 |

### 密度排行（格子数 = 列 × 行）

```
Bloomberg 440+  Odoo 300   Terminal TUI 260   AliyunConsole 225
VS Code 198     GitLab 196  抖音 196          Cloudscape 195
Linear 182      Toss 182    飞书 182          デジタル庁 182
GOV.UK 156      Figma 154   Fluent 156        Ant Design 132
```

## 三条经过验证的结论

1. **骨架维度此前是真空白**
   原 28 套里 **22 套共用同一种 11–13 列表格结构**，列宽差异全在 ±4px 以内
   （`TDesign 38/74/62/144…` vs `Windows11 36/72/62/144…`）。
   真正骨架不同的只有 4 套。第 6 行那 5 张才是信息架构级的不同。

2. **表单页的体系差异大于列表页**
   列表页把差异压扁了（都是表格）；表单页从最基础的决策就分道扬镳：
   | | Material 3 | Ant Design 5 |
   |---|---|---|
   | 标签位置 | 字段上方，浮进边框缺口 | 字段左侧，右对齐 |
   | 必填星号 | 标签后 | 标签前 |
   | 字段高度 | 56px | 32px |
   弹窗按钮顺序同理：**Fluent 主按钮在左**（微软范式），M3/Ant 确认在右。

3. **反装饰 ≠ 低密度**
   GOV.UK 零圆角、粗边框、19px 大字号，156 格反而高于 Ant Design 的 132 格。
   装饰量和信息密度是两个独立轴。

## 怎么改 / 怎么重新组装

```bash
cd design-explore
# 1. 改某张：直接编辑 XxxYyy.dc.html（或改生成脚本重跑）
# 2. 改布局：编辑 canvas.json（artboards 的 x/y/page，annotations 的说明文字）
# 3. 重新组装（60 张全量）
SKILL=/private/tmp/claude-501/bundled-skills/<版本>/<hash>/design
ARGS=(); for f in *.dc.html; do ARGS+=(--artboard "$f"); done
node "$SKILL/seed-canvas.mjs" --template "$SKILL/payload.template.html" \
  --out scaffold-visual-redesign.html --title "脚手架视觉重设计" \
  "${ARGS[@]}" --canvas canvas.json
# 4. 校验
node "$SKILL/seed-canvas.mjs" --check scaffold-visual-redesign.html
# 5. 发布到同一 URL（Artifact 工具，contract 0.1.31，favicon 🎨，不传 capabilities）
```

**注意**：`SKILL` 路径里的版本号和 hash 会随 Claude Code 版本变化，
下次用 `/design` 重新触发 skill 拿到当前路径，或 `find /private/tmp/claude-501/bundled-skills -name seed-canvas.mjs`。

### 辅助文件

- `_members.py` — 14 条成员数据（工号/姓名/邮箱/状态/部门/角色/手机/入职/最近登录/2FA/数据范围）
- `_kit.py` — `banner()` / `page()` / `svg()` / 19 个图标字典 `I` / 7 项菜单 `NAV7`
- `BRIEF.md` — 列表页稿件规格（画布尺寸、密度门槛 130 格、.dc.html 格式约束）
- `BRIEF-PAGETYPE.md` — 页型稿规格（表单 ≥14 字段、详情 ≥24 信息项、空态+弹窗同图）

## 落地验证：主题系统为什么「一直没达到满意效果」

**已实测**（2026-08-25，在 localhost:5173 上跑的，非推断）：

### 量化根因

| | base 定义 | 4 个 flavor 能覆盖 |
|---|---|---|
| 颜色量 | 31 | 3–10 |
| **几何量** | **55** | **3**（badge 内距 / focus 环） |
| 其他 | 195 | 11–25 |
| 合计 | 281 | **22–34（7.8%–12.1%）** |

**布局骨架级几何量的 flavor 覆盖率 = 0%**。feishu 更极端，全文只覆盖 4 个变量。

### 四层锁

| # | 锁 | 位置 | 性质 |
|---|---|---|---|
| 1 | 注释「不是 flavor 密度轴」 | `tokens.base.css:172` | 设计意图 |
| 2 | base 值被断言写死 44/38/12px | `tokens.snapshot.test.ts:200-204` | **机器强制** |
| 3 | 26 个几何量禁 flavor 覆盖 | `tokens.snapshot.test.ts:206-234` | **机器强制** |
| 4 | 286 处硬编码 `calc(Npx*var(--app-scale))` | 全项目 grep | 隐性地板 |

第 3 层的 26 个 token：shell-header-h 52 / sidebar-w 200 / collapsed 60 / rail-w 60 /
rail-panel 140 / inset 200 / nav-item-h 36 / nav-subitem-h 34 / nav-icon 16 /
page-frame-px 18 / py 14 / table-header-h 38 / **table-row-h 44** / table-cell-px 12 /
choice-size 14 / card-spacing 16·14·24 / metric-min-h 96 / metric-spacing 14 + 4 色 / detail-aside-w 296

### 第 4 层的实测过程（关键）

```
设 --table-row-h: 28px          →  实测行高 31px（纹丝不动）
再压字号 11px / 行高 14px / padding 归零  →  还是 31px
定位到 div.size-[calc(30px*var(--app-scale))]  ← 头像硬编码，不走 token
把头像改 18px                    →  行高立刻 28px ✓ 假设确认
```

**30px 头像 + 1px 边框 = 31px 行高硬地板**，任何 flavor 都压不破。
所以画布里的 Bloomberg（20px 行高）、Odoo（30px）、Fluent（34px），**当前架构下一张都落不了地**。

### 改造方案（三选一，均未实测）

| | A · 密度因子 | B · 几何入 flavor | C · 分层 |
|---|---|---|---|
| 做法 | 复用 `--radius-factor` 模式加 `--density-*`，base 改 `calc(44px * var(--density-table) * var(--app-scale))` | 删 26 条 guard，flavor 自带完整几何 | flavor 给默认密度档 + 用户可覆盖 |
| flavor 要写 | 3–4 个因子 | 26 个几何量 × 4 套 | 两套优先级 |
| 切主题跳变 | 不跳 | **会跳** | 可配 |
| 「像两个系统」 | 部分 | **完全** | 完全 |
| 硬伤 | 单因子表达不了「表格密但侧栏正常」 | 工作量最大 | 最复杂 |

**推荐顺序**：先做三者的共同前置 —— **token 化关键硬编码（头像/行内按钮/图标尺寸）拆掉地板**，
这步独立有价值且可验证（拆完再设 28px 应真能到 28px）；然后走 A（改动小），
拿 Bloomberg 和 Fluent 当验收样本；A 的单因子若确实不够用，再往 B 走。

## 下次可以接着做的

- [ ] **最小验证**：只 token 化头像那一处，跑 guard + 视觉回归，确认拆地板的路走得通
- [ ] 深色版（60 张里只有约 6 张深色，深色最能暴露 token 架构问题）
- [ ] 窄屏 1280（全部是 1440，12–20 列的表在 1280 上怎么塌完全未知）
- [ ] 剩余体系：Datadog / Sentry / Retool / Airtable / Monday / Slack / Discord /
      Swiss 国际主义 / 工程蓝图 / 报纸-FT 数据新闻 / Cyberpunk / Y2K / Memphis / Bauhaus

## 环境问题（待修，与本项目无关）

`pnpm theme:guard` 在本机跑不了：corepack 要下载 pnpm 11.7.0 并清 `node_modules`，
无 TTY 时中止（`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`）。
绕法（也是项目 CLAUDE.md 写的方式）：

```bash
cd frontend && ./node_modules/.bin/vitest run \
  src/styles/__tests__/theme-guards.test.ts \
  src/styles/__tests__/tokens.snapshot.test.ts \
  src/styles/__tests__/profile-contract.test.ts \
  src/app/__tests__/module-boundaries.test.ts
```
