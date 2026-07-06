import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { featuresConfig } from '@/config';

const UNREAD = 3; // M0 写死；消息中心在 M1 接真实未读数

// 未接真前只在开发/demo 显示，生产交付隐藏避免露假功能（诊断 F8）。
export function NotificationBell() {
  const { t } = useTranslation();
  if (!featuresConfig.showStubChrome) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => toast(t('shell.toast.notification'))}
          aria-label={t('shell.notification')}
        >
          <Bell className="size-5" />
          {UNREAD > 0 && (
            <span className="absolute right-1 top-1 flex h-[calc(15px*var(--app-scale))] min-w-[calc(15px*var(--app-scale))] items-center justify-center rounded-full border-[1.5px] border-surface bg-danger px-1 text-[calc(10px*var(--app-scale))] font-semibold text-white">
              {UNREAD}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('shell.notification')}</TooltipContent>
    </Tooltip>
  );
}
