import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const designDir = 'docs/design';
const files = readdirSync(designDir)
  .filter((file) => file.endsWith('.design.md'))
  .sort()
  .map((file) => join(designDir, file));

const allowedWarnings = new Map([
  [
    'docs/design/claude.design.md:components.button-primary',
    '官方 Claude/Anthropic 主按钮取舍：白字 on coral 低于 AA 已记录，正文禁用该组合。',
  ],
  [
    'docs/design/claude.design.md:components.button-primary-active',
    '官方 Claude/Anthropic active clay 白字取舍：短生命周期按钮态，正文禁用该组合。',
  ],
  [
    'docs/design/claude.design.md:components.button-primary-disabled',
    'disabled 态不作为可操作文本，按 spec 白名单豁免。',
  ],
  [
    'docs/design/claude.design.md:components.select-option-highlighted',
    '高亮态是短生命周期交互反馈，真实文字对比由 token 深色值与浏览器矩阵复核。',
  ],
  [
    'docs/design/claude.design.md:components.nav-item-current',
    '导航当前态是短标签状态反馈，真实文字对比由 token 深色值与浏览器矩阵复核。',
  ],
  ['docs/design/claude.design.md:colors.border-strong', '设计身份层边框梯度 token，作为值表来源保留。'],
  ['docs/design/claude.design.md:colors.border', '设计身份层边框梯度 token，作为值表来源保留。'],
  ['docs/design/claude.design.md:colors.border-soft', '设计身份层边框梯度 token，作为值表来源保留。'],
  ['docs/design/feishu.design.md:components.text-input-disabled', 'disabled 态不作为可操作文本，按 spec 白名单豁免。'],
  ['docs/design/feishu.design.md:components.button-primary', '飞书官方主蓝对白字略低于 AA，作为品牌主操作色保留，正文禁用该组合。'],
  ['docs/design/feishu.design.md:components.button-primary-active', '飞书 active 蓝用于短生命周期按钮态，真实可读性由浏览器矩阵复核。'],
  ['docs/design/feishu.design.md:components.select-option-highlighted', '选项高亮是短生命周期交互反馈，真实文字对比由浏览器矩阵复核。'],
  ['docs/design/feishu.design.md:components.nav-item-current', '导航当前态是短标签状态反馈，真实文字对比由浏览器矩阵复核。'],
  ['docs/design/feishu.design.md:components.table-header', 'transparent 底由 lint 工具当黑底处理，实际表头背景由表格 token 注入。'],
  ['docs/design/feishu.design.md:colors.primary-pressed', '设计身份层状态色，作为值表来源保留。'],
  ['docs/design/feishu.design.md:colors.hairline', '设计身份层边框 token，作为值表来源保留。'],
  ['docs/design/feishu.design.md:colors.border-card', '设计身份层边框 token，作为值表来源保留。'],
  ['docs/design/feishu.design.md:colors.border-component', '设计身份层边框 token，作为值表来源保留。'],
  ['docs/design/feishu.design.md:colors.divider', '设计身份层分割线 token，作为值表来源保留。'],
  ['docs/design/feishu.design.md:colors.fill-hover', '设计身份层状态色，作为值表来源保留。'],
  ['docs/design/feishu.design.md:colors.fill-pressed', '设计身份层状态色，作为值表来源保留。'],
  ['docs/design/feishu.design.md:colors.fill-selected', '设计身份层状态色，作为值表来源保留。'],
  ['docs/design/feishu.design.md:colors.success', '语义状态色，作为值表来源保留。'],
  ['docs/design/feishu.design.md:colors.warning', '语义状态色，作为值表来源保留。'],
  ['docs/design/shadcn.design.md:components.text-input', 'transparent 底由 lint 工具当黑底处理，实际背景由页面 surface/token 决定。'],
  ['docs/design/shadcn.design.md:components.text-input-focused', 'transparent 底由 lint 工具当黑底处理，实际背景由页面 surface/token 决定。'],
  ['docs/design/shadcn.design.md:colors.primary-fg', '设计身份层前景 token，作为 shadcn 语义来源保留。'],
  ['docs/design/shadcn.design.md:colors.body', '设计身份层文字 token，作为值表来源保留。'],
  ['docs/design/shadcn.design.md:colors.hairline', '设计身份层边框 token，作为值表来源保留。'],
  ['docs/design/shadcn.design.md:colors.ring', '设计身份层 focus ring token，作为值表来源保留。'],
  ['docs/design/shadcn.design.md:colors.success', '语义状态色，作为值表来源保留。'],
  ['docs/design/shadcn.design.md:colors.warning', '语义状态色，作为值表来源保留。'],
  // sera 复用 shadcn zinc 色 + 透明底输入（D1），contrast/未引用告警与 shadcn 逐条镜像。
  ['docs/design/sera.design.md:components.text-input', 'transparent 底由 lint 工具当黑底处理，实际背景由页面 surface/token 决定；sera 输入为底边线透明底。'],
  ['docs/design/sera.design.md:components.text-input-focused', 'transparent 底由 lint 工具当黑底处理，实际背景由页面 surface/token 决定；sera 聚焦只变底边不铺底。'],
  ['docs/design/sera.design.md:colors.primary-fg', '设计身份层前景 token，作为 sera（复用 shadcn 色）语义来源保留。'],
  ['docs/design/sera.design.md:colors.body', '设计身份层文字 token，作为值表来源保留。'],
  ['docs/design/sera.design.md:colors.hairline', '设计身份层边框 token，作为值表来源保留。'],
  ['docs/design/sera.design.md:colors.ring', '设计身份层 focus ring token，作为值表来源保留。'],
  ['docs/design/sera.design.md:colors.success', '语义状态色，作为值表来源保留。'],
  ['docs/design/sera.design.md:colors.warning', '语义状态色，作为值表来源保留。'],
]);

const reports = [];
const errors = [];
const warnings = [];
const unexpectedWarnings = [];

for (const file of files) {
  const result = spawnSync('npx', ['--yes', '@google/design.md', 'lint', file], {
    encoding: 'utf8',
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.stderr) process.stderr.write(result.stderr);

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    process.stdout.write(result.stdout);
    console.error(error);
    process.exit(1);
  }

  reports.push({ file, report });

  for (const finding of report.findings ?? []) {
    const keyedFinding = { file, ...finding, key: `${file}:${finding.path ?? ''}` };
    if (finding.severity === 'error') errors.push(keyedFinding);
    if (finding.severity === 'warning') {
      warnings.push(keyedFinding);
      if (!allowedWarnings.has(keyedFinding.key)) unexpectedWarnings.push(keyedFinding);
    }
  }

  if (result.status !== 0) {
    errors.push({ file, severity: 'error', message: `design.md lint exited with ${result.status}`, key: `${file}:exit` });
  }
}

if (errors.length > 0 || unexpectedWarnings.length > 0) {
  console.error(JSON.stringify(reports, null, 2));
  if (unexpectedWarnings.length > 0) {
    console.error('\nUnexpected DESIGN.md warnings:');
    for (const warning of unexpectedWarnings) {
      console.error(`- ${warning.key}: ${warning.message}`);
    }
  }
  process.exit(1);
}

console.log(JSON.stringify({
  files,
  summary: {
    errors: errors.length,
    warnings: warnings.length,
    infos: reports.reduce((sum, item) => sum + (item.report.summary?.infos ?? 0), 0),
  },
  allowedWarnings: warnings.map((warning) => ({
    file: warning.file,
    path: warning.path,
    message: warning.message,
    reason: allowedWarnings.get(warning.key),
  })),
}, null, 2));
