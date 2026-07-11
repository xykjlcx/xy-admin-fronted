import { useRef, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronDown, User, Settings, KeyRound, Languages, UserCog, HelpCircle, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { meQuery, authApi } from '@/modules/admin/auth/api';
import { resetSession } from '@/lib/reset-auth';
import { appConfig } from '@/config';

export function UserMenu({ variant = 'header' }: { variant?: 'header' | 'sidebar' | 'icon' } = {}) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { data: me } = useSuspenseQuery(meQuery);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pointerTriggeredRef = useRef(false);
  const initial = me.user.name.slice(0, 1);
  const roleLabel = me.roles[0] ? t(`shell.roles.${me.roles[0]}`, me.roles[0]) : '';
  const compact = variant === 'icon';
  const suppressSidebarFocusRestore = variant === 'sidebar';

  const stub = () => toast(t('shell.toast.stub'));
  const openProfile = (tab: 'info' | 'security' | 'preferences', action?: 'password') => {
    setOpen(false);
    void nav({ to: '/admin/profile', search: { tab, action } });
  };

  const logout = async () => {
    // 后端登出失败不阻断前端清理：无论如何回登录并清缓存
    try {
      await authApi.logout();
    } catch {
      toast.error(t('shell.toast.logoutFailed'));
    }
    // 先离开受保护树，再清缓存：否则 Shell 里挂载中的 useSuspenseQuery 会用空 token 重拉。
    await nav({ to: appConfig.routes.login });
    await resetSession(null);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          aria-label={variant !== 'sidebar' ? `${me.user.name} ${roleLabel}` : undefined}
          onPointerDown={
            suppressSidebarFocusRestore
              ? () => {
                  pointerTriggeredRef.current = true;
                }
              : undefined
          }
          onKeyDown={
            suppressSidebarFocusRestore
              ? () => {
                  pointerTriggeredRef.current = false;
                }
              : undefined
          }
          className={cn(
            'flex items-center gap-2.5 rounded-8 outline-none transition-colors hover:bg-(--nav-item-bg-hover)',
            variant !== 'sidebar' &&
              'focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring)',
            variant === 'header' && 'px-2 py-1 max-lg:size-9 max-lg:justify-center max-lg:p-0',
            variant === 'sidebar' &&
              'w-full rounded-9 px-2 py-2 text-left hover:bg-(--nav-item-bg-hover) focus-visible:bg-(--nav-item-bg-hover) focus-visible:shadow-none',
            variant === 'icon' && 'size-9 justify-center p-0',
          )}
        >
          <Avatar className="size-[calc(30px*var(--app-scale))] rounded-8">
            <AvatarFallback className="rounded-8 bg-(--nav-item-fg-current) text-[calc(13px*var(--app-scale))] font-semibold text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <>
              <div className={cn('min-w-0 flex-1 text-left leading-tight', variant === 'header' && 'max-lg:hidden')}>
                <div className="truncate text-[calc(13px*var(--app-scale))] font-semibold text-text">
                  {me.user.name}
                </div>
                <div className="truncate text-[calc(11px*var(--app-scale))] text-text-3">{roleLabel}</div>
              </div>
              <ChevronDown
                className={cn(
                  'size-3.5 shrink-0 text-text-3 transition-transform',
                  variant === 'header' && 'max-lg:hidden',
                  open && 'rotate-180',
                )}
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === 'header' ? 'end' : 'start'}
        side={variant === 'header' ? 'bottom' : 'right'}
        sideOffset={8}
        className="w-[calc(280px*var(--app-scale))] overflow-hidden p-0"
        onCloseAutoFocus={(event) => {
          if (!suppressSidebarFocusRestore || !pointerTriggeredRef.current) return;
          event.preventDefault();
          triggerRef.current?.blur();
          pointerTriggeredRef.current = false;
        }}
      >
        <div className="flex items-center gap-3 p-[calc(18px*var(--app-scale))] pb-4">
          <Avatar className="size-11 rounded-11">
            <AvatarFallback className="rounded-11 bg-(--nav-item-fg-current) text-base font-semibold text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-[calc(15px*var(--app-scale))] font-semibold text-text">{me.user.name}</div>
            <div className="mt-0.5 truncate text-xs text-text-3">{me.user.username}</div>
          </div>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuGroup className="p-1.5">
          <DropdownMenuItem
            onClick={() => openProfile('info')}
            className="h-[calc(42px*var(--app-scale))] gap-3 px-3"
          >
            <User />
            {t('shell.user.profile')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openProfile('security')}
            className="h-[calc(42px*var(--app-scale))] gap-3 px-3"
          >
            <Settings />
            {t('shell.user.account')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openProfile('security', 'password')}
            className="h-[calc(42px*var(--app-scale))] gap-3 px-3"
          >
            <KeyRound />
            {t('shell.user.changePassword')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openProfile('preferences')}
            className="h-[calc(42px*var(--app-scale))] gap-3 px-3"
          >
            <Languages />
            {t('shell.user.language')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={stub} className="h-[calc(42px*var(--app-scale))] gap-3 px-3">
            <UserCog />
            {t('shell.user.switchAccount')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={stub} className="h-[calc(42px*var(--app-scale))] gap-3 px-3">
            <HelpCircle />
            {t('shell.user.help')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuGroup className="p-1.5">
          <DropdownMenuItem
            variant="destructive"
            onClick={() => void logout()}
            className="h-[calc(42px*var(--app-scale))] gap-3 px-3"
          >
            <LogOut />
            {t('shell.user.logout')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
