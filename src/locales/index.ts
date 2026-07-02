// 语言资源唯一聚合点：i18n.ts 只 import 本文件。
// 加子系统命名空间时只改这里（配合"整目录删除"承诺：删域 = 删 json + 删本文件对应两行）。
import zhCommon from './zh-CN/common.json';
import zhAdmin from './zh-CN/admin.json';
import enCommon from './en-US/common.json';
import enAdmin from './en-US/admin.json';

export const resources = {
  'zh-CN': { common: zhCommon, admin: zhAdmin },
  'en-US': { common: enCommon, admin: enAdmin },
} as const;
