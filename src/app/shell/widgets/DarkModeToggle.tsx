import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppearance } from '@/stores/appearance';

// 明暗切换：与外观抽屉同源（都走 store.set → applyAppearance），此处只是快捷入口
export function DarkModeToggle() {
  const { t } = useTranslation();
  const mode = useAppearance((s) => s.mode);
  const set = useAppearance((s) => s.set);
  const isDark = mode === 'dark';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-text-2 hover:text-text-2"
          onClick={() => set({ mode: isDark ? 'light' : 'dark' })}
          aria-label={isDark ? t('shell.lightMode') : t('shell.darkMode')}
        >
          {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isDark ? t('shell.lightMode') : t('shell.darkMode')}</TooltipContent>
    </Tooltip>
  );
}
