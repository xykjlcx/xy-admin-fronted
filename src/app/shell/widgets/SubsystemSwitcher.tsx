import { useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check, LayoutGrid } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { lv } from '@/lib/localized';
import { Icon } from '@/lib/icon-registry';
import { subsystemKeyFromPath } from '../subsystem-key';
import type { Subsystem } from '@/modules/types';

// 子系统切换器：不感知布局。variant 决定弹层规格与触发形态：
//   header — 500px 双列网格，锚定顶栏（原型 L266）
//   brand  — 320px 单列，锚定侧栏顶部品牌位（原型 L185）；collapsed 时仅显示图标
export function SubsystemSwitcher({
  subsystems,
  variant = 'header',
  collapsed = false,
}: {
  subsystems: Subsystem[];
  variant?: 'header' | 'brand';
  collapsed?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const activeKey = subsystemKeyFromPath(pathname);
  const active = subsystems.find((s) => s.key === activeKey) ?? subsystems[0];

  const select = (s: Subsystem) => {
    setOpen(false);
    void nav({ to: s.home });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'brand' ? (
          <button
            className={cn(
              'flex items-center gap-2.5',
              collapsed
                ? 'justify-center'
                : 'w-full rounded-lg bg-surface px-2.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.06)]',
            )}
          >
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-white"
              style={{ background: active?.builtin ? 'var(--pri)' : active?.color }}
            >
              <Icon name={active?.icon} className="size-[18px]" />
            </span>
            {!collapsed && active && (
              <>
                <div className="min-w-0 flex-1 text-left leading-tight">
                  <div className="truncate text-sm font-semibold text-text">
                    {lv(active.label, i18n.language)}
                  </div>
                  <div className="truncate text-xs text-text-3">
                    {lv(active.desc, i18n.language)}
                  </div>
                </div>
                <LayoutGrid className="size-4 shrink-0 text-text-3" />
              </>
            )}
          </button>
        ) : (
          <button className="flex h-9 items-center gap-[9px] rounded-md pl-2.5 pr-3 hover:bg-pri-soft">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-sm text-white"
              style={{ background: active?.builtin ? 'var(--pri)' : active?.color }}
            >
              <Icon name={active?.icon} className="size-[15px]" />
            </span>
            <span className="text-sm font-semibold text-text">
              {active ? lv(active.label, i18n.language) : ''}
            </span>
            <ChevronDown
              className={cn('size-3.5 text-text-3 transition-transform', open && 'rotate-180')}
            />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={variant === 'brand' ? 6 : 8}
        className={cn(variant === 'brand' ? 'w-[320px] p-3' : 'w-[500px] p-4')}
      >
        <div className="px-1 pb-3 pt-0.5 text-[13px] font-semibold text-text-2">
          {t('shell.switcher.title')}
        </div>
        <div className={cn(variant === 'brand' ? 'flex flex-col gap-2' : 'grid grid-cols-2 gap-2.5')}>
          {subsystems.map((s) => {
            const isActive = s.key === activeKey;
            const soon = !s.enabled && !s.builtin;
            return (
              <button
                key={s.key}
                disabled={soon}
                onClick={() => select(s)}
                className={cn(
                  'relative flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  isActive
                    ? 'border-pri bg-pri-soft'
                    : 'border-border bg-surface hover:border-pri',
                  soon && 'cursor-not-allowed opacity-60 hover:border-border',
                )}
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ background: s.builtin ? 'var(--pri)' : s.color }}
                >
                  <Icon name={s.icon} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-text">
                    {lv(s.label, i18n.language)}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-text-3">
                    {lv(s.desc, i18n.language)}
                  </div>
                </div>
                {soon && (
                  <span className="absolute right-2 top-2 rounded-sm bg-surface-2 px-1.5 py-px text-[10px] text-text-3">
                    {t('shell.switcher.soon')}
                  </span>
                )}
                {isActive && <Check className="size-4 shrink-0 text-pri" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
