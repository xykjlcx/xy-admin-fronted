import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ChevronDown,
  User,
  Settings,
  KeyRound,
  Languages,
  UserCog,
  HelpCircle,
  LogOut,
} from 'lucide-react';
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
import { meQuery, authApi } from '@/modules/admin/api/auth.api';
import { resetAuth } from '@/lib/reset-auth';

export function UserMenu() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { data: me } = useSuspenseQuery(meQuery);
  const [open, setOpen] = useState(false);
  const initial = me.user.name.slice(0, 1);

  const stub = () => toast(t('shell.toast.stub'));

  const logout = async () => {
    // 后端登出失败不阻断前端清理：无论如何清 token + auth 缓存并回登录
    try {
      await authApi.logout();
    } catch {
      toast.error(t('shell.toast.logoutFailed'));
    }
    resetAuth(null);
    void nav({ to: '/login' });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 rounded-md px-2 py-1 hover:bg-surface-2">
          <Avatar className="size-[30px] rounded-md">
            <AvatarFallback className="rounded-md bg-pri text-[13px] font-semibold text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="text-left leading-tight">
            <div className="text-[13px] font-semibold text-text">{me.user.name}</div>
            <div className="text-[11px] text-text-3">{me.roles[0] ?? ''}</div>
          </div>
          <ChevronDown
            className={cn('size-3.5 text-text-3 transition-transform', open && 'rotate-180')}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[280px] overflow-hidden p-0">
        <div className="flex items-center gap-3 p-[18px] pb-4">
          <Avatar className="size-11 rounded-lg">
            <AvatarFallback className="rounded-lg bg-pri text-base font-semibold text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-text">{me.user.name}</div>
            <div className="mt-0.5 truncate text-xs text-text-3">{me.user.username}</div>
          </div>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuGroup className="p-1.5">
          <DropdownMenuItem onClick={stub} className="h-[42px] gap-3 px-3">
            <User />
            {t('shell.user.profile')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={stub} className="h-[42px] gap-3 px-3">
            <Settings />
            {t('shell.user.account')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={stub} className="h-[42px] gap-3 px-3">
            <KeyRound />
            {t('shell.user.changePassword')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={stub} className="h-[42px] gap-3 px-3">
            <Languages />
            {t('shell.user.language')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={stub} className="h-[42px] gap-3 px-3">
            <UserCog />
            {t('shell.user.switchAccount')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={stub} className="h-[42px] gap-3 px-3">
            <HelpCircle />
            {t('shell.user.help')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuGroup className="p-1.5">
          <DropdownMenuItem
            variant="destructive"
            onClick={() => void logout()}
            className="h-[42px] gap-3 px-3"
          >
            <LogOut />
            {t('shell.user.logout')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
