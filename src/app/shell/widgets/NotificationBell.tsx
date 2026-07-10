import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { messagesQuery } from '@/modules/admin/messages/api';

export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useQuery(messagesQuery('all'));
  const unreadCount = data?.unreadCount ?? 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => void navigate({ to: '/admin/messages' })}
          aria-label={t('shell.notification')}
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-[calc(15px*var(--app-scale))] min-w-[calc(15px*var(--app-scale))] items-center justify-center rounded-full border-[1.5px] border-surface bg-danger px-1 text-[calc(10px*var(--app-scale))] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('shell.notification')}</TooltipContent>
    </Tooltip>
  );
}
