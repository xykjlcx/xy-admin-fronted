import { DEFAULT_LOCALE } from '@/lib/i18n-config';

export type LocalizedString = Record<string, string>;

export function lv(ls: LocalizedString | undefined, locale: string): string {
  if (!ls) return '';
  // || 而非 ??：空串视同缺失继续回退（多语言输入框删空保存的现实场景）
  return ls[locale] || ls[DEFAULT_LOCALE] || Object.values(ls).find(Boolean) || '';
}

// 只更新当前 locale 的键、保留其他语言，避免编辑双语数据时把其他语言整体覆盖丢失。
// value 为空（trim 后）时删除当前 locale 键，其余语言仍保留（对应「英文界面删空短名称」等场景）。
export function mergeLocalized(
  original: LocalizedString | undefined,
  locale: string,
  value: string,
): LocalizedString {
  const next: LocalizedString = { ...original };
  const trimmed = value.trim();
  if (trimmed) {
    next[locale] = trimmed;
  } else {
    delete next[locale];
  }
  return next;
}
