import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Token Profile Contract 守卫（spec: docs/superpowers/specs/2026-07-08-token-profile-contract-design.md）。
 *
 * 职责：只校验 profile 文件（tokens.base / tokens.{flavor}.css）的**结构**，不校验值（值归 tokens.snapshot）。
 * 把「加一套 flavor 该写什么」从隐性约定升级为机器可校验 contract：极小「表」+ 推导式不变量。
 *
 * ┌─ 新增一个 flavor（如 sera）怎么做 ────────────────────────────────────────┐
 * │ 1. 建 src/styles/tokens.sera.css（M4 强制：tokens.<flavor>.css 与 FLAVORS 双向绑定）。       │
 * │ 2. key 加进下方 FLAVORS。                                                                    │
 * │ 3. 照 M1–M3 填齐：                                                                           │
 * │      · [data-flavor='sera'][data-mode='light'] 与 ...dark 两个颜色块，                        │
 * │        各自声明齐 REQUIRED_COLOR_TOKENS 的 11 色（明暗同值也要各写一遍，刚性）；               │
 * │      · html:not([data-radius])[data-flavor='sera'] 块声明 --radius-factor。                  │
 * │ 4. 组件族覆盖（--field-* / --table-* …）可选，从 base 已有 token 里挑（R1 自动兜底回落）。      │
 * │ 5. 结构铁律 R1–R6 零维护，会自动拦私货 token / 越权选择器 / at-rule / 裸 CSS 属性。            │
 * └────────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * 默认 flavor（feishu）的 light 颜色块住 tokens.base.css 的兜底合并选择器（选项 Z），不在自家文件重复。
 * 换 DEFAULT_FLAVOR 需三步联动（base 兜底换人 + 原默认 light 块下沉自家文件 + 改常量），否则 R3 立即报红。
 */

// ============================================================================
// 「表」——手写清单（唯一需要人维护的部分，spec §3.2）
// ============================================================================

/** 已注册 flavor。新增 flavor：加 key + 建同名 tokens.<key>.css（M4 双向绑定）。 */
const FLAVORS = ['feishu', 'claude', 'shadcn'] as const;

/** 默认 flavor：其 light 颜色块住 base 兜底合并选择器（选项 Z）。 */
const DEFAULT_FLAVOR = 'feishu';

/**
 * 明/暗颜色块各自必须覆盖的 11 色（三家现状交集，2026-07-08 实测钉死）。
 * 刻意不进必填集的三色及理由：
 *   --pri          （accent 运行时机制可接管，shadcn dark 实例）
 *   --control-border/--divider（base 兜底，shadcn light 实例）
 */
const REQUIRED_COLOR_TOKENS: readonly string[] = [
  '--pri-soft',
  '--bg',
  '--canvas',
  '--surface',
  '--chrome',
  '--surface-2',
  '--surface-blur',
  '--text',
  '--text-2',
  '--text-3',
  '--border',
];

// ============================================================================
// 解析器（零依赖，spec §3.5）
// ============================================================================

interface Block {
  /** 合并选择器 split ',' + trim 后的单选择器列表。 */
  readonly sel: string[];
  /** 块体原文（`{}` 之间），供 R5 剥离检测。 */
  readonly body: string;
  /** 块内 `--x:` 声明的 token 名。 */
  readonly decls: string[];
}

interface ParsedFile {
  readonly blocks: Block[];
  /** 块级解析得到的声明总数。 */
  readonly blockDeclCount: number;
  /** 剥注释后全文扁平 matchAll 的声明总数（R4 用于自检配块完整性）。 */
  readonly flatCount: number;
  /** 剥注释后的全文（R6 用于扫 at-rule）。 */
  readonly clean: string;
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parse(src: string): ParsedFile {
  const clean = stripComments(src);
  const blocks: Block[] = [];

  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selRaw = m[1];
    const body = m[2];
    if (selRaw === undefined || body === undefined) continue;

    const sel = selRaw
      .split(',')
      .map((s) => s.trim().replace(/\s+/g, ' '))
      .filter((s) => s.length > 0);

    const decls: string[] = [];
    for (const d of body.matchAll(/(?<![\w-])(--[a-zA-Z0-9_-]+)\s*:/g)) {
      const token = d[1];
      if (token !== undefined) decls.push(token);
    }

    blocks.push({ sel, body, decls });
  }

  const blockDeclCount = blocks.reduce((n, b) => n + b.decls.length, 0);
  const flatCount = [...clean.matchAll(/(?<![\w-])(--[a-zA-Z0-9_-]+)\s*:/g)].length;

  return { blocks, blockDeclCount, flatCount, clean };
}

// ============================================================================
// runContract：纯函数，返回违规描述数组（空数组 = 合规），不碰磁盘
//   files: { 'tokens.base.css': 源码, 'tokens.feishu.css': 源码, ... }
//   config: 允许变异测试内存注入不同 FLAVORS/默认值；正常调用走默认 = 上方三常量
// ============================================================================

interface ContractConfig {
  readonly flavors: readonly string[];
  readonly defaultFlavor: string;
  readonly requiredColorTokens: readonly string[];
}

const DEFAULT_CONFIG: ContractConfig = {
  flavors: FLAVORS,
  defaultFlavor: DEFAULT_FLAVOR,
  requiredColorTokens: REQUIRED_COLOR_TOKENS,
};

const FLAVOR_FILE_RE = /^tokens\.(.+)\.css$/;

/** R2 白名单：对 flavor f，选择器字面全等允许同形态多块。 */
function whitelistFor(f: string): Set<string> {
  return new Set([
    `[data-flavor='${f}'][data-mode='light']`,
    `[data-flavor='${f}'][data-mode='dark']`,
    `[data-flavor='${f}']`,
    `html:not([data-radius])[data-flavor='${f}']`,
  ]);
}

function runContract(
  files: Record<string, string>,
  config: ContractConfig = DEFAULT_CONFIG,
): string[] {
  const { flavors, defaultFlavor, requiredColorTokens } = config;
  const violations: string[] = [];

  const parsedByName = new Map<string, ParsedFile>();
  for (const [name, src] of Object.entries(files)) parsedByName.set(name, parse(src));

  const baseParsed = parsedByName.get('tokens.base.css');
  const baseBlocks = baseParsed ? baseParsed.blocks : [];
  const baseDecls = new Set(baseBlocks.flatMap((b) => b.decls));

  // 文件系统里除 base 外的 flavor 文件名（M4 双向绑定的一侧）。
  const flavorFileNames: string[] = [];
  for (const name of parsedByName.keys()) {
    const captured = FLAVOR_FILE_RE.exec(name)?.[1];
    if (captured !== undefined && captured !== 'base') flavorFileNames.push(captured);
  }

  // ---- M1 明暗块存在 / M2 颜色必填 / M3 radius-factor（检查域 = base ∪ 自家文件）----
  for (const f of flavors) {
    const own = parsedByName.get(`tokens.${f}.css`);
    const domain = own ? [...baseBlocks, ...own.blocks] : baseBlocks;

    for (const mode of ['light', 'dark'] as const) {
      const sel = `[data-flavor='${f}'][data-mode='${mode}']`;
      const matching = domain.filter((b) => b.sel.includes(sel));
      if (matching.length === 0) {
        violations.push(`M1:${f}/${mode} 缺 ${sel} 块`);
        continue;
      }
      const union = new Set(matching.flatMap((b) => b.decls));
      const missing = requiredColorTokens.filter((t) => !union.has(t));
      if (missing.length > 0) violations.push(`M2:${f}/${mode} 缺必填色 ${missing.join(',')}`);
    }

    const radiusSel = `html:not([data-radius])[data-flavor='${f}']`;
    const radiusBlock = domain.find((b) => b.sel.includes(radiusSel));
    if (!radiusBlock || !radiusBlock.decls.includes('--radius-factor')) {
      violations.push(`M3:${f} 缺 ${radiusSel} 块或 --radius-factor 声明`);
    }
  }

  // ---- M4 注册双向绑定 ----
  for (const name of flavorFileNames) {
    if (!flavors.includes(name)) {
      violations.push(`M4:${name} tokens.${name}.css 存在但未注册进 FLAVORS`);
    }
  }
  for (const f of flavors) {
    if (!flavorFileNames.includes(f)) {
      violations.push(`M4:${f} 已注册但缺 tokens.${f}.css 文件`);
    }
  }

  // ---- R1 回落保证：flavor 声明全集 ⊆ base 声明全集 ----
  for (const name of flavorFileNames) {
    const fp = parsedByName.get(`tokens.${name}.css`);
    if (!fp) continue;
    const reported = new Set<string>();
    for (const b of fp.blocks) {
      for (const t of b.decls) {
        if (!baseDecls.has(t) && !reported.has(t)) {
          reported.add(t);
          violations.push(`R1:${name} 私货 ${t}`);
        }
      }
    }
  }

  // ---- R2 选择器纪律：flavor 文件每个块的每个选择器 ∈ 自家 4 形态白名单 ----
  for (const name of flavorFileNames) {
    const fp = parsedByName.get(`tokens.${name}.css`);
    if (!fp) continue;
    const allow = whitelistFor(name);
    for (const b of fp.blocks) {
      for (const s of b.sel) {
        if (!allow.has(s)) violations.push(`R2:${name} 非法选择器 ${s}`);
      }
    }
  }

  // ---- R3 base 纯净：含 [data-flavor= 的单选择器只允许恰为默认 flavor 的 light 兜底，且与 :root 同块 ----
  const exemptSel = `[data-flavor='${defaultFlavor}'][data-mode='light']`;
  for (const b of baseBlocks) {
    for (const s of b.sel) {
      if (!s.includes('[data-flavor=')) continue;
      if (s !== exemptSel) {
        violations.push(`R3:base 非法 flavor 选择器 ${s}`);
      } else if (!b.sel.includes(':root')) {
        violations.push(`R3:base 兜底选择器 ${s} 未与 :root 合并`);
      }
    }
  }

  // ---- R4 解析完整性自检：块级声明总数 == 扁平声明总数 ----
  for (const [name, fp] of parsedByName) {
    if (fp.blockDeclCount !== fp.flatCount) {
      violations.push(`R4:${name} 解析完整性失败 block=${fp.blockDeclCount} flat=${fp.flatCount}`);
    }
  }

  // ---- R5 块体纯 token：剥去全部 --x: value; 后残留不得含「属性:」形态声明 ----
  for (const [name, fp] of parsedByName) {
    const label = FLAVOR_FILE_RE.exec(name)?.[1] ?? name;
    for (const b of fp.blocks) {
      const residual = b.body.replace(/(?<![\w-])--[a-zA-Z0-9_-]+\s*:[^;]*;?/g, '');
      const hit = residual.match(/[a-zA-Z-]+\s*:[^;]*/);
      if (hit) violations.push(`R5:${label} 残留裸属性声明 ${hit[0].trim()}`);
    }
  }

  // ---- R6 禁 at-rule：剥注释后不得出现 @（@media/@supports 会被正则静默剥壳，R4 拦不住）----
  for (const [name, fp] of parsedByName) {
    if (fp.clean.includes('@')) violations.push(`R6:${name} 剥注释后含 at-rule @`);
  }

  return violations;
}

// ============================================================================
// 真实文件读取
// ============================================================================

const STYLES_DIR = resolve(__dirname, '..');

function readCss(name: string): string {
  return readFileSync(resolve(STYLES_DIR, name), 'utf8');
}

/** 每次返回一份全新对象，保证各变异 test 互不污染。 */
function realFiles(): Record<string, string> {
  return {
    'tokens.base.css': readCss('tokens.base.css'),
    'tokens.feishu.css': readCss('tokens.feishu.css'),
    'tokens.claude.css': readCss('tokens.claude.css'),
    'tokens.shadcn.css': readCss('tokens.shadcn.css'),
  };
}

/** 读真文件 + 对某个 key 做字符串替换注入，返回全新 files 对象。 */
function withMutation(key: string, mutate: (src: string) => string): Record<string, string> {
  const files = realFiles();
  const src = files[key];
  if (src === undefined) throw new Error(`fixture missing ${key}`);
  files[key] = mutate(src);
  return files;
}

/** 断言违规清单命中某规则前缀。 */
function hasRule(violations: string[], prefix: string): boolean {
  return violations.some((v) => v.startsWith(prefix));
}

// ============================================================================
// 绿灯组：现状 4 文件不改任何 CSS 即全绿
// ============================================================================

describe('profile-contract 绿灯组', () => {
  test('现状 tokens.{base,feishu,claude,shadcn}.css 跑 runContract 返回 []', () => {
    expect(runContract(realFiles())).toEqual([]);
  });
});

// ============================================================================
// 红灯组：spec §4 变异验收表 11 条，每条命中预期规则前缀
// ============================================================================

describe('profile-contract 红灯组（§4 变异表 11 条）', () => {
  test('变异1：删 feishu dark 的 --bg → M2', () => {
    const files = withMutation('tokens.feishu.css', (s) => s.replace('--bg: #111318;', ''));
    const v = runContract(files);
    expect(hasRule(v, 'M2:')).toBe(true);
  });

  test('变异2：删 shadcn 整个 dark 颜色块 → M1', () => {
    // shadcn 有两处 dark 块（颜色块 + field 覆盖块），全部移除才让 dark 消失，等价于 spec 注记的「块选择器改名」。
    const files = withMutation('tokens.shadcn.css', (s) =>
      s.replace(/\[data-flavor='shadcn'\]\[data-mode='dark'\]\s*\{[^{}]*\}/g, ''),
    );
    const v = runContract(files);
    expect(hasRule(v, 'M1:')).toBe(true);
  });

  test('变异3：删 claude 的 radius-factor 行 → M3', () => {
    const files = withMutation('tokens.claude.css', (s) =>
      s.replace("html:not([data-radius])[data-flavor='claude'] { --radius-factor: 1; }", ''),
    );
    const v = runContract(files);
    expect(hasRule(v, 'M3:')).toBe(true);
  });

  test('变异4：FLAVORS 删 shadcn（文件成孤儿）→ M4 正向', () => {
    // 文件系统仍有 tokens.shadcn.css，但 FLAVORS 不含 shadcn → 未注册的孤儿文件。
    const v = runContract(realFiles(), { ...DEFAULT_CONFIG, flavors: ['feishu', 'claude'] });
    expect(hasRule(v, 'M4:')).toBe(true);
  });

  test('变异5：新增 tokens.sera.css 但 FLAVORS 未注册 → M4 反向', () => {
    const files = realFiles();
    // sera 内容自身结构合规（token 在 base、选择器合法），只是没进 FLAVORS，故仅 M4 报红。
    files['tokens.sera.css'] = "[data-flavor='sera'][data-mode='light'] { --bg: #ffffff; }";
    const v = runContract(files);
    expect(hasRule(v, 'M4:')).toBe(true);
  });

  test('变异6：claude 文件加 base 没有的 --fake-token → R1', () => {
    const files = withMutation('tokens.claude.css', (s) =>
      s.replace(
        '--pri-hover: color-mix(in srgb, var(--pri) 92%, black);',
        '--pri-hover: color-mix(in srgb, var(--pri) 92%, black);\n  --fake-token: 1;',
      ),
    );
    const v = runContract(files);
    expect(hasRule(v, 'R1:')).toBe(true);
  });

  test('变异7：shadcn 文件写 [data-flavor=claude] 块 → R2', () => {
    const files = withMutation(
      'tokens.shadcn.css',
      (s) => `${s}\n[data-flavor='claude'] { --pri: #18181b; }`,
    );
    const v = runContract(files);
    expect(hasRule(v, 'R2:')).toBe(true);
  });

  test('变异8：base 加 [data-flavor=claude] 块 → R3', () => {
    const files = withMutation(
      'tokens.base.css',
      (s) => `${s}\n[data-flavor='claude'] { --pri: #18181b; }`,
    );
    const v = runContract(files);
    expect(hasRule(v, 'R3:')).toBe(true);
  });

  test("变异9：注入值内花括号 --x: '}' → R4", () => {
    // 注入到 base :root 尾部 shadow 声明中：其后的 shadow 声明被错误配块吞进「选择器」，
    // 块级计数 < 扁平计数 → R4 报红（这些 shadow token 无 flavor 引用，不触发其他规则）。
    const files = withMutation('tokens.base.css', (s) =>
      s.replace('--shadow-modal: 0 16px 48px rgba(0, 0, 0, 0.18);', "--shadow-modal: '}';"),
    );
    const v = runContract(files);
    expect(hasRule(v, 'R4:')).toBe(true);
  });

  test('变异10：合规块内注入 text-transform: uppercase → R5', () => {
    const files = withMutation('tokens.claude.css', (s) =>
      s.replace(
        "[data-flavor='claude'][data-mode='light'] {",
        "[data-flavor='claude'][data-mode='light'] {\n  text-transform: uppercase;",
      ),
    );
    const v = runContract(files);
    expect(hasRule(v, 'R5:')).toBe(true);
  });

  test('变异11：覆盖包进 @media → R6', () => {
    const files = withMutation(
      'tokens.shadcn.css',
      (s) => `${s}\n@media (prefers-color-scheme: dark) { [data-flavor='shadcn'] { --pri: #18181b; } }`,
    );
    const v = runContract(files);
    expect(hasRule(v, 'R6:')).toBe(true);
  });
});
