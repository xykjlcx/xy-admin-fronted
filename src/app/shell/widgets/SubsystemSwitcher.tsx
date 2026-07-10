import { useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { lv } from '@/lib/localized';
import { Icon } from '@/lib/icon-registry';
import { subsystemKeyFromPath } from '../subsystem-key';
import type { Subsystem } from '@/modules/types';

// 子系统切换器：不感知布局。variant 决定弹层规格与触发形态：
//   header — 500px 双列网格，锚定顶栏（原型 L266）
//   brand  — 触发器等宽单列，锚定侧栏顶部品牌位（原型 L185）；collapsed 时仅显示图标
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
  const isBrand = variant === 'brand';

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
              'group flex w-full items-center gap-2 rounded-8 text-left text-text-2 transition-colors',
              collapsed
                ? 'justify-center'
                : 'px-2 py-2 hover:bg-(--nav-item-bg-hover) hover:text-text',
            )}
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-7 bg-(--nav-item-bg-current) text-(--nav-item-fg-current)"
            >
              <Icon name={active?.icon} className="size-[calc(16px*var(--app-scale))]" />
            </span>
            {!collapsed && active && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-medium">
                    {lv(active.label, i18n.language)}
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    'size-3.5 shrink-0 text-text-3 transition-transform group-hover:text-text-2',
                    open && 'rotate-180',
                  )}
                />
              </>
            )}
          </button>
        ) : (
          <button
            aria-label={active ? lv(active.label, i18n.language) : t('shell.switcher.title')}
            className="flex h-9 items-center gap-[calc(9px*var(--app-scale))] rounded-7 pl-2.5 pr-3 hover:bg-(--nav-item-bg-hover) max-lg:px-2"
          >
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-6 text-white"
              style={{ background: active?.builtin ? 'var(--accent-emphasis)' : active?.color }}
            >
              <Icon name={active?.icon} className="size-[calc(15px*var(--app-scale))]" />
            </span>
            <span className="text-sm font-semibold text-text max-lg:hidden">
              {active ? lv(active.label, i18n.language) : ''}
            </span>
            <ChevronDown
              className={cn('size-3.5 text-text-3 transition-transform max-lg:hidden', open && 'rotate-180')}
            />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={isBrand ? 6 : 8}
        className={cn(isBrand ? 'w-[var(--radix-popover-trigger-width)] p-1.5' : 'w-[calc(500px*var(--app-scale))] p-4')}
      >
        <div
          className={cn(
            'font-semibold text-text-2',
            isBrand
              ? 'px-2 pb-1.5 pt-1 text-[calc(12px*var(--app-scale))]'
              : 'px-1 pb-3 pt-0.5 text-[calc(13px*var(--app-scale))]',
          )}
        >
          {t('shell.switcher.title')}
        </div>
        <div className={cn(isBrand ? 'flex flex-col gap-1' : 'grid grid-cols-2 gap-2.5')}>
          {subsystems.map((s) => {
            const isActive = s.key === activeKey;
            const soon = !s.enabled && !s.builtin;
            return (
              <button
                key={s.key}
                disabled={soon}
                onClick={() => select(s)}
                className={cn(
                  'relative flex items-center text-left transition-colors',
                  isBrand ? 'gap-2 rounded-9 border px-2 py-2' : 'gap-3 rounded-12 border p-3',
                  isActive
                    ? 'border-(--nav-item-border-current) bg-(--nav-item-bg-current) shadow-(--nav-item-shadow-current)'
                    : 'border-border bg-surface hover:border-(--nav-item-fg-current)',
                  soon && 'cursor-not-allowed opacity-60 hover:border-border',
                )}
              >
                <span
                  className={cn(
                    'flex shrink-0 items-center justify-center text-white',
                    isBrand ? 'size-8 rounded-8' : 'size-10 rounded-10',
                  )}
                  style={{ background: s.builtin ? 'var(--accent-emphasis)' : s.color }}
                >
                  <Icon name={s.icon} className={isBrand ? 'size-4' : 'size-5'} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-text">
                    {lv(s.label, i18n.language)}
                  </div>
                  {!isBrand && (
                    <div className="mt-0.5 truncate text-xs text-text-3">
                      {lv(s.desc, i18n.language)}
                    </div>
                  )}
                </div>
                {soon && (
                  <span className="absolute right-2 top-2 rounded-4 bg-(--table-header-bg) px-1.5 py-px text-[calc(10px*var(--app-scale))] text-text-3">
                    {t('shell.switcher.soon')}
                  </span>
                )}
                {isActive && <Check className="size-4 shrink-0 text-(--nav-item-fg-current)" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
