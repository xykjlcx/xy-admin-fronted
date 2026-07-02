export type LocalizedString = Record<string, string>;

export function lv(ls: LocalizedString | undefined, locale: string): string {
  if (!ls) return '';
  return ls[locale] || ls['zh-CN'] || Object.values(ls).find(Boolean) || '';
}
