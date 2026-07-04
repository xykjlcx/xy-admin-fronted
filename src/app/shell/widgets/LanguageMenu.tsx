import { Globe, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
        <Button variant="ghost" size="icon" aria-label={t('shell.language')}>
          <Globe className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[calc(200px*var(--app-scale))] rounded-12 p-1.5">
        <div className="px-2.5 pb-1.5 pt-2 text-[calc(11px*var(--app-scale))] font-semibold text-text-3">
          {t('shell.language')}
        </div>
        {LANGS.map((l) => {
          const active = current === l.code;
          return (
            <DropdownMenuItem
              key={l.code}
              onSelect={() => choose(l.code)}
              className={cn(
                'h-11 gap-2.5 rounded-8 px-2.5',
                active ? 'bg-pri-soft focus:bg-pri-soft' : 'focus:bg-surface-2',
              )}
            >
              <span className="text-base">{l.flag}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-text">{l.label}</div>
                <div className="text-[calc(11px*var(--app-scale))] text-text-3">{l.sub}</div>
              </div>
              {active && <Check className="size-4 shrink-0 text-pri" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
