import { DEFAULT_LOCALE } from '@/lib/i18n-config';

export type LocalizedString = Record<string, string>;

export function lv(ls: LocalizedString | undefined, locale: string): string {
  if (!ls) return '';
  // || 而非 ??：空串视同缺失继续回退（多语言输入框删空保存的现实场景）
  return ls[locale] || ls[DEFAULT_LOCALE] || Object.values(ls).find(Boolean) || '';
}
