# Codex 任务：主题 Token 体系 Step 9 精修切片（值表 v4 落地 + 验收缺陷修复）

## 背景

你此前完成的 Step 3-8 已验收（有条件通过，记录见 spec §17）。本切片做两件事：
把值表 v4（spec §10.2b）统一落地，并修复验收发现的缺陷（P0/P1/P2 已全部转为下方任务）。
spec 已升级到 v4.1，是唯一权威源；你实施 Step 3-8 时依据的 v3.1 值凡与 §10.2b 冲突，以 §10.2b 为准。

## 必读文档（动手前全部读完）

1. `docs/superpowers/specs/2026-07-04-theme-token-system-design.md` —— 重点：
   §7.2（scope 清单，pagination 已追认）、§7.5/§7.7（状态优先级与状态机机制，本切片核心）、
   §7.8（highlighted 已修订为 focus: + data-[highlighted]: 双源）、§8（Radix 硬约束 12 条，逐条遵守）、
   §10.2b（值表 v4 增量 + 页面层语义 token 裁决 + claude 主按钮白字拍板）、§12（验证方案）、
   §17 Step 9（任务清单 10 条与验收标准）。
2. `docs/design/{feishu,claude,shadcn}.design.md` —— 三份设计身份文档（值来源）。
3. `docs/design/research/README.md` —— 原始实测数据索引（值有疑问时回查存档，禁止凭印象定值）。

## 任务清单（= spec §17 Step 9 十条，按此顺序做）

1. **alpha 交互态 token**：`--fill-hover / --fill-pressed / --fill-selected` 按 §10.2b 机制级定义落地
   tokens.css（light 墨 alpha / dark 白 alpha / flavor 覆盖强度），逐族把 `hover:bg-surface-2` 类交互底
   迁移到 `--fill-*`；`--surface-2` 回归"静态次级表面"语义（表头底、禁用底）。
2. **feishu 值修正**：`--pri-hover` 方向翻转（`color-mix(in srgb, var(--pri) 85%, white)`）；
   边框两级 card `#DEE0E3` / component `#D0D3D6` + divider N900@15%；selected 底 alpha 化（蓝@10%）。
3. **claude 值修正**：clay `#cc785c → #D97757`、active `#C6613F`、soft `rgba(217,119,87,0.12)`；
   边框改墨色 `#1F1E1D` alpha 三级（40/30/15%，dark 反转 `#DEDCD1` 同档）；
   bg 阶梯对齐官方（light 工作面 `#FFFFFF` / secondary `#F5F4ED` / 画布 `#FAF9F5`；dark `#30302E/#262624/#141413`）；
   **主按钮文字色改白字 `#FFFFFF`**（拍板跟随官方；design-md-lint 白名单已有该条目豁免）。
   同步回写 `docs/design/claude.design.md` 的 YAML 值与 prose（你在 9393fee 标注的"Step 9 精修候选"现在落地），
   并更新 DESIGN.md↔tokens.css↔appearance-dom 三处一致性断言。ACCENTS 中 claude 精确值一并更新。
4. **shadcn 值修正**：控件高 32 → 36px（h-9，形态轴联动）；dark 边框 `oklch(1 0 0 / 10%)`；
   dark 输入底 `bg-input/30`；invalid ring `destructive/20`（dark `/40`）；primary hover `/90` 透明混合。
5. **hover 派生方向 flavor 化**：`--pri-hover`/`--pri-active` 改 flavor 可覆盖（§10.2b 裁决），
   ACCENTS `active` 字段模式推广。
6. **值对照回写**：Step 3-8 各族实施所用值与 `docs/design/research/` 存档逐项对照，差异回写值表或说明。
7. **【P0-1】三族状态机钩子**：Table 行 / Tabs-line / Choice 现用同特异性 Tailwind 变体表达 §7.5
   跨状态压制（selected/expanded 压 hover、active 压 hover、invalid 压 focus、disabled 压 checked），
   违反 §7.7-2。按 Field 族同构补 global.css 钩子（`.ui-table-row` / `.ui-tabs-line-trigger` / `.ui-choice`：
   单消费点 + `--_` 中间 token 按 §7.5 优先级声明顺序重赋值），组件消费点迁移到钩子。
   中间 token 不进公共契约、不许组件外消费（§7.7）。
8. **【P1-1】页面层语义 token**：落地 `--accent-emphasis`（默认 = `--pri`）与 `--accent-emphasis-soft`
   （= `--fill-selected`），替换 Step 7 洗白点位：`users/model.ts`、`roles/model.ts` 头像底、
   `MenuTreeTable` 目录徽章/图标、`SubsystemSwitcher` builtin 徽章、`RoleDetailsPanel` refreshing 标签、
   `RolePermissionEditor` chip/KeyRound/全选按钮——这些点位当前挂在 `--nav-item-*`/`--table-action-*`
   上语义不符。`roles/model.ts` 的 `logToneClass.add`/`roleToneClass.create` 从 info 回归 `--accent-emphasis`。
9. **【P1-4】Sheet 抽屉阴影**：右抽屉当前用 `--overlay-shadow-modal`（对称下沉），偏离原方向性
   `--shadow-drawer`（`-8px 0 32px .14`）。浏览器并排对比后二选一：回归方向性投影，或确认留用 modal
   阴影并回写 spec §9.6 说明；无论哪个，清理孤儿 token（tokens.css 中无人消费的 `--shadow-drawer`）。
10. **【P2 清理】**：
    - `theme-guards.test.ts` `violationRoots` 补 `src/app` 全域（当前只扫 shell/widgets，layouts 逃逸）；
    - `tokenizedStateFiles` 强约束改词边界正则匹配（当前 `.includes()` 无词边界）；
    - baseline 余量补判例标注：badge/progress 在 guard 测试或 architecture.md 注明"§6.2 语义色直接消费，
      合法保留"；dashboard/login 注明"Step 3-8 范围外，待后续切片"（或顺手清零，二选一）；
    - dropdown-menu.tsx SubContent 缩进修复。

## 硬约束（违反任何一条 = 返工）

- **§7.7-2**：凡 §7.5 跨状态压制一律走状态机钩子，禁止依赖 Tailwind 变体生成顺序——这是本切片的执行核心，
  也是 Step 3-8 唯一 P0 的修复。
- **§7.8**：选择器映射按修订后的表写（highlighted = `focus:` + `data-[highlighted]:` 双源），禁止自行发挥；
  Radix 弹层选项仍禁写 `hover:`。
- **§8 Radix 硬约束 12 条**：Portal / outside event / autoFocus / Escape / `--radix-*` 变量 / `data-state`
  动画一律不动，只改 class/token。
- **§4.2**：组件代码禁止 flavor 分支；差异全部走 token 值。
- **§10.3 值表纪律**：所有落值以 §10.2b 与 research/ 存档为准，禁止凭描述推测；发现值表单元格与存档冲突，
  停下来在 PR 说明里列出，不要自行定值。
- 组件禁十六进制、禁 `rounded-[Npx]`、`--app-scale` 乘法不破坏（项目既有铁律）。
- 视觉可见的变更（阴影、transition、颜色语义改动）必须在提交信息或 PR 说明里逐条列出，不允许静默。

## 提交纪律

拆 3 个提交：①值层（任务 1-6）②状态机与页面层语义 token（任务 7-8）③清理与文档（任务 9-10）。
每个提交前四条命令 + 两个门禁必须全绿。

## 验收标准（全部满足才许交付）

1. `./node_modules/.bin/tsc -b --noEmit`、`./node_modules/.bin/vitest run`、
   `./node_modules/.bin/eslint src`、`pnpm theme:guard`、`pnpm design:lint` 全绿。
2. 违规 class baseline 不新增（棘轮只减不增；任务 8 替换洗白点位后 pri-ban guard 仍绿）。
3. `/dev/theme-states` 三 flavor × light/dark 浏览器截图：机制级差异保持
   （feishu 灰底反转无 ring / claude coral 晕染 / shadcn 透明底中灰晕染），值层符合 §10.2b。
4. 三族状态机压制对在浏览器 computed style 下方向正确（悬停已选中表格行仍显 selected 底、
   hover 已激活 line tab 仍显 active 色、聚焦 invalid radio 显 danger ring、checked+disabled checkbox 显禁用底）。
5. 不退化抽验：shadcn dark 主按钮可读、自定义亮色 accent 前景可读、Dialog 内嵌 Select 不误关父级、
   Escape 逐层关闭、`--radix-*` 变量存在。
6. **禁止"应该可以了 / 理论上没问题"**——每一条验收标准都要给出实际命令输出或截图证据；
   没跑过的就明说没跑，不允许宣称。
