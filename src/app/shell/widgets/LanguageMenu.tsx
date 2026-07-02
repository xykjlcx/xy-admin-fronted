import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n-config';

// 语言名按惯例用其本身语言书写，不走 i18n
const LANGS = [
  { code: 'zh-CN', flag: '🇨🇳', label: '简体中文', sub: 'Simplified Chinese' },
  { code: 'en-US', flag: '🇬🇧', label: 'English', sub: '英语' },
] as const;

export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const current = i18n.language;
  const choose = (code: string) => {
    void i18n.changeLanguage(code);
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-text-2" aria-label={t('shell.language')}>
          <Globe className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[200px] rounded-lg p-1.5">
        <div className="px-2.5 pb-1.5 pt-2 text-[11px] font-semibold text-text-3">
          {t('shell.language')}
        </div>
        {LANGS.map((l) => {
          const active = current === l.code;
          return (
            <button
              key={l.code}
              onClick={() => choose(l.code)}
              className={cn(
                'flex h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left',
                active ? 'bg-pri-soft' : 'hover:bg-surface-2',
              )}
            >
              <span className="text-base">{l.flag}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-text">{l.label}</div>
                <div className="text-[11px] text-text-3">{l.sub}</div>
              </div>
              {active && <Check className="size-4 shrink-0 text-pri" />}
            </button>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
