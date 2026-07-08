# S2:Token Profile Contract + 完备性 Guard 设计

- 日期:2026-07-08
- 状态:v2 — 对抗审修订版(guard 原型实测现状绿 + 5 变异红;对抗性 review 实测发现 4 Important 已全部采纳:R1 域决策显性化、新增 R5 块体纯 token、R6 禁 at-rule 替换 §3.5 假声明、变异覆盖补齐至 11 条全规则)
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
- 「型」分支(`text-transform` 等裸 CSS 属性)**不进 profile 文件**——住 `global.css` 状态机层(`.ui-*`,含 §7.8 的 uppercase 豁免机制)。此边界由 R5 机器强制,不是仅文档约定。
- `--text-*`/`--spacing` 等 Tailwind 盖写 token 现住 global.css,不在 contract 管辖内;§7.5 排印切片开放某 token 的 flavor 覆盖时,**先把该 token 默认声明迁入 tokens.base.css**(迁移即注册)。R1 因此顺带守卫「全局 `--spacing` 严禁按 flavor 分叉」(PRD §7.5 实施纪律):spacing 不迁 base,flavor 写它必红。

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
| M2 颜色必填 | 明/暗块各自的 token 集 ⊇ `REQUIRED_COLOR_TOKENS` | 同一 flavor 同 mode 多块时取并集;必填色**必须落在 mode-specific 块内**(mode 无关块 `[data-flavor='X']` 不计入并集)——明暗同值也要各写一遍,刻意刚性,现状三家均如此 |
| M3 radius-factor | `html:not([data-radius])[data-flavor='X']` 块存在且声明 `--radius-factor` | — |
| M4 注册双向绑定 | `FLAVORS` ↔ 文件系统 `tokens.<flavor>.css` 双向一致(除 base 外的 `tokens.*.css` 必须全在 FLAVORS,反之必须有文件) | 防"加了文件忘进 contract"与"注册了没文件" |

### 3.4 推导式不变量(R1–R6,零维护,不随 token 增删改动)

| 铁律 | 断言 | 拦住什么 |
| --- | --- | --- |
| R1 回落保证 | 每个 flavor 文件声明的 token 全集 ⊆ base 声明全集(**刻意仅 tokens.base.css,不含 global.css**,见 §2 非目标末条) | 发明 base 没有的私货 token;顺带拦「flavor 分叉 global.css 盖写 token(--spacing 等)」 |
| R2 选择器纪律 | flavor 文件每个块的选择器(split `,` 后逐个)∈ 该 flavor 的 4 形态白名单(见下),只准写自家 `[data-flavor='X']` | claude 文件污染 shadcn、裸 `:root` 污染全局 |
| R3 base 纯净 | base 文件 split 后的单选择器中,含 `[data-flavor=` 的只允许恰为 `[data-flavor='<DEFAULT_FLAVOR>'][data-mode='light']`,且该选择器必须与 `:root` 同块(兜底合并选择器) | flavor 覆盖回流 base,拆分退化回单文件 |
| R4 解析完整性自检 | 每文件:块级解析的声明总数 == 剥注释后全文扁平 matchAll 总数 | 值内花括号等破坏配块的输入(实测 fail-closed 成立) |
| R5 块体纯 token | 每块体剥去全部 `--x: value;` 声明后,残留文本不得再含 `属性:` 形态的声明 | 裸 CSS 属性注入(如 `text-transform: uppercase` 藏进合规块——对抗审实测的全绿泄漏路径);机器强制「型分支住 global.css 状态机层」 |
| R6 禁 at-rule | profile 文件(含 base)剥注释后不得出现 `@` 字符 | `@media`/`@supports` 包裹层会被正则解析器静默剥掉(对抗审实测:R4 对此**不红**),导致合同看不见条件包裹;显式禁掉,失败闭合 |

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

已于 2026-07-08 在 4 个真实文件上验证(提取结果与人工核对一致)。解析器边界(对抗审实测结论):值内花括号(`--x: '}'`)→ R4 红,fail-closed ✅;字体栈引号/逗号、`:not()`、`var()` 引用 → 均不误判 ✅;**at-rule 嵌套会被正则静默剥壳且 R4 不红**(初稿声称会红,已证伪)→ 由 R6 显式禁 `@` 兜住。

## 4. 验收标准

1. 现状三 flavor **不改任何 CSS** 即全绿(2026-07-08 guard 原型已实测 ✅)。
2. 变异测试**全规则覆盖**(每条 M/R 至少一条红灯证明;实现方式:guard 逻辑抽为纯函数 `runContract(files)`,真文件跑绿灯组,内存字符串注入跑红灯组,不碰磁盘文件):

| # | 变异注入 | 必红规则 | 原型实测 |
| --- | --- | --- | --- |
| 1 | 删 feishu dark 的 `--bg` | M2 | ✅ |
| 2 | 删 shadcn 整个 dark 颜色块 | M1 | ✅(等价变异:块选择器改名) |
| 3 | 删 claude 的 radius-factor 行 | M3 | 待实施 |
| 4 | FLAVORS 删 'shadcn'(文件成孤儿) | M4 文件未注册臂 | ✅ |
| 5 | 新增 tokens.sera.css 但 FLAVORS 未注册 | M4 文件未注册臂(注入向) | ✅ |
| 12 | FLAVORS 注册 sera 但文件不存在 | M4 缺文件臂(S5 逆场景) | ✅(验收时补,初稿表将 5 误标"反向"——4/5 实为同臂) |
| 6 | claude 文件加 base 没有的 `--fake-token` | R1 | ✅ |
| 7 | shadcn 文件写 `[data-flavor='claude']` 块 | R2 | ✅ |
| 8 | base 加 `[data-flavor='claude']` 块 | R3 | ✅ |
| 9 | 注入值内花括号 `--x: '}'` | R4 | ✅(对抗审 ATTACK5) |
| 10 | 合规块内注入 `text-transform: uppercase` | R5 | 对抗审 ATTACK2 证明现设计放行,R5 补拦 |
| 11 | 覆盖包进 `@media` | R6 | 对抗审 ATTACK1 证明 R4 不红,R6 补拦 |

3. `pnpm theme:guard` 含新文件;全套(tsc/eslint/vitest/theme:guard)绿。
4. 面向 S5 的可用性:sera 作者只读该测试文件即知道要填什么(表 + 注释自足)。

## 5. 风险与控制

| 风险 | 控制 |
| --- | --- |
| 正则解析器对非规整 CSS 失效 | R4(值内花括号 fail-closed,实测)+ R6(禁 at-rule,堵实测发现的 R4 盲区);非目标里明确不引 postcss,真需要时再换 |
| 必填集(11 色)将来变化 | 表就是拿来改的:改 `REQUIRED_COLOR_TOKENS` + 同 commit 改齐各 flavor 文件 |
| 与 tokens.snapshot / theme-guards 职责重叠 | 分工明确:snapshot 管值 + import 顺序、theme-guards 管"定义↔引用"、contract 管**profile 结构**;互不断言对方领域 |
| DEFAULT_FLAVOR 未来换人 | 三步联动:base 兜底合并选择器换人 + 原默认 flavor 的 light 块下沉自家文件 + 常量改值;只改常量不改 CSS 时 R3 立刻红(fail-safe,对抗审实测) |
| `tokens.<flavor>.css` 命名被非 flavor 分片占用 | 该命名模式为 flavor profile 保留字(M4 强制);未来若出现非 flavor 分片(如组件族拆片)须用其他命名或并入 base |
