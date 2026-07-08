# S2:Token Profile Contract + 完备性 Guard 设计

- 日期:2026-07-08
- 状态:已评审通过(会话内探查 + 设计呈现 + 用户确认)
- 来源:PRD `2026-07-07-shadcn-create-inspired-design-system-prd.md` §6.6 第 2 条;前置 S1(tokens.css 拆分,commit `3232127`)已落地
- 范围:纯加测试,**零 CSS 改动**;现状三 flavor 即全绿
- 定位:把「加一套风格该写什么」从隐性约定升级为机器可校验的 contract——"表"(必填清单)极小化,结构纪律全走推导式不变量

## 1. 探查依据(2026-07-08 实测,块级解析)

| 文件 | 块结构 | 唯一 token 数 |
| --- | --- | --- |
| tokens.base.css | 兜底色块(=feishu light)14 + 巨型 `:root` 196 + 通用 dark 5 + radius 档×2 + scale 档×3 | 全集 **209** |
| tokens.feishu.css | dark 颜色 11 + radius-factor | 12(不对称默认:light 住 base 兜底,选项 Z) |
| tokens.claude.css | light 14 + dark 14 + `[data-flavor='claude']` 覆盖 19 + dark 微调 3 + radius-factor | 34 |
| tokens.shadcn.css | light 12 + dark 13 + `[data-flavor='shadcn']` 覆盖 19 + dark 微调 3 + radius-factor | 34 |

关键事实:

1. **颜色块集合不齐是合理设计**:shadcn light 缺 `--control-border/--divider`(吃 base 兜底)、shadcn dark 缺 `--pri`(accent 运行时 `priDark` 机制接管)、feishu dark 11 色。三家全部明暗块的交集 = **11 色**,即天然必填集。
2. **组件覆盖层 100% 可选**(feishu 零覆盖),且三家覆盖的全部 token 均在 base 有回落声明(现状已满足 R1)。
3. **选择器纪律已自发成形**:flavor 文件只出现 4 种形态,零裸 `:root`、零跨 flavor 引用。
4. **解析陷阱实测**:逐行式提取(awk)因"一行多声明 + 单行块"漏采 60%——guard 解析器必须块级 + 带完整性自检(R4 的由来)。

## 2. 目标 / 非目标

**目标**

- 新增 flavor 从"凭感觉抄"变"填表":照必填清单填齐 → guard 绿即结构合规。
- 锁死 4 条已成立的结构不变量,防后续切片(S3 组件族挂点、S5 sera)腐蚀边界。

**非目标**

- 不动任何 CSS(现状即合规是验收标准之一)。
- 不管 `global.css` 的 `.ui-*` 状态机与 `@theme inline` 映射(PRD §6.6-2 范围 = profile 文件)。
- 不做独立 contract 数据模块(载体 = guard 测试文件内常量;消费方唯一,YAGNI。未来真出现第二消费方再抽)。
- 不做值域校验(值的对错归 `tokens.snapshot.test.ts`;contract 只管**结构**)。
- 不引入 postcss 等解析依赖(约 15 行零依赖解析器足够,已在真实文件验证)。

## 3. 设计

### 3.1 产出物

新建 `src/styles/__tests__/profile-contract.test.ts`,并入 `pnpm theme:guard`(package.json 的 vitest 文件列表追加)。

### 3.2 "表"——手写清单(文件顶部常量,唯一需要人维护的部分)

```ts
// 新增 flavor 时:key 加进 FLAVORS → 照 M1-M3 填齐 → 组件覆盖从 base 全集里挑(R1 自动兜底)
const FLAVORS = ['feishu', 'claude', 'shadcn'] as const;
const DEFAULT_FLAVOR = 'feishu'; // 选项 Z:默认 flavor 的 light 颜色块住 base 兜底合并选择器

// 明/暗颜色块各自必须覆盖的 11 色(三家现状交集,2026-07-08 实测钉死)
const REQUIRED_COLOR_TOKENS = [
  '--pri-soft', '--bg', '--canvas', '--surface', '--chrome', '--surface-2',
  '--surface-blur', '--text', '--text-2', '--text-3', '--border',
];
```

刻意不进必填集的三色及理由:`--pri`(accent 运行时机制可接管,shadcn dark 实例)、`--control-border`/`--divider`(base 兜底,shadcn light 实例)。

### 3.3 必填规则(清单式,M1–M4)

| 规则 | 断言 | 备注 |
| --- | --- | --- |
| M1 明暗块存在 | 每个 flavor 的 `[data-flavor='X'][data-mode='light']` 与 `...dark` 块必须存在;检查域 = **base ∪ 自家文件** | 检查域含 base,feishu light(住 base 兜底合并选择器)自然通过,无需硬编码特例 |
| M2 颜色必填 | 明/暗块各自的 token 集 ⊇ `REQUIRED_COLOR_TOKENS` | 同一 flavor 同 mode 多块时取并集 |
| M3 radius-factor | `html:not([data-radius])[data-flavor='X']` 块存在且声明 `--radius-factor` | — |
| M4 注册双向绑定 | `FLAVORS` ↔ 文件系统 `tokens.<flavor>.css` 双向一致(除 base 外的 `tokens.*.css` 必须全在 FLAVORS,反之必须有文件) | 防"加了文件忘进 contract"与"注册了没文件" |

### 3.4 推导式不变量(R1–R4,零维护,不随 token 增删改动)

| 铁律 | 断言 | 拦住什么 |
| --- | --- | --- |
| R1 回落保证 | 每个 flavor 文件声明的 token 全集 ⊆ base 声明全集 | 发明 base 没有的私货 token → 切别家风格时悬空 |
| R2 选择器纪律 | flavor 文件每个块的选择器 ∈ 该 flavor 的 4 形态白名单(见下),只准写自家 `[data-flavor='X']` | claude 文件污染 shadcn、裸 `:root` 污染全局 |
| R3 base 纯净 | base 文件不得出现含 `[data-flavor=` 的选择器;唯一豁免:兜底合并选择器 `:root, [data-flavor='<DEFAULT_FLAVOR>'][data-mode='light']` | flavor 覆盖回流 base,拆分退化回单文件 |
| R4 解析完整性自检 | 每文件:块级解析的声明总数 == 剥注释后全文扁平 matchAll 总数 | 解析器静默漏块(实测踩过的坑) |

R2 白名单(对 flavor X,选择器字面全等,允许同形态多块):

```
[data-flavor='X'][data-mode='light']
[data-flavor='X'][data-mode='dark']
[data-flavor='X']
html:not([data-radius])[data-flavor='X']
```

### 3.5 解析器(测试文件内,零依赖,~15 行)

```
剥注释 /\/\*[\s\S]*?\*\//g
→ 花括号配块 /([^{}]+)\{([^{}]*)\}/g
→ 选择器按 ',' split + trim(支持合并选择器)
→ 块内声明 /(?<![\w-])(--[a-zA-Z0-9_-]+)\s*:/g
```

已于 2026-07-08 在 4 个真实文件上验证(提取结果与人工核对一致)。前提:profile 文件无嵌套 at-rule(现状成立);若未来出现嵌套,R4 自检会因计数不齐而红,倒逼升级解析器——失败闭合。

## 4. 验收标准

1. 现状三 flavor **不改任何 CSS** 即全绿。
2. 变异测试(实施计划中作为 TDD 红灯依据,逐条注入 → guard 必红):删 feishu dark 的 `--bg`(M2 红)/ 在 claude 文件加 base 没有的 `--fake-token`(R1 红)/ 在 shadcn 文件写 `[data-flavor='claude']` 块(R2 红)/ 在 base 加 `[data-flavor='claude']` 块(R3 红)/ FLAVORS 删 'shadcn'(M4 红)。
3. `pnpm theme:guard` 含新文件;全套(tsc/eslint/vitest/theme:guard)绿。
4. 面向 S5 的可用性:sera 作者只读该测试文件即知道要填什么(表 + 注释自足)。

## 5. 风险与控制

| 风险 | 控制 |
| --- | --- |
| 正则解析器对非规整 CSS 失效 | R4 完整性自检失败闭合;非目标里明确不引 postcss,真需要时再换 |
| 必填集(11 色)将来变化 | 表就是拿来改的:改 `REQUIRED_COLOR_TOKENS` + 同 commit 改齐各 flavor 文件 |
| 与 tokens.snapshot / theme-guards 职责重叠 | 分工明确:snapshot 管值、theme-guards 管"定义↔引用"、contract 管**profile 结构**;互不断言对方领域 |
