import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

export interface AnimatedTabItem<TValue extends string> {
  value: TValue;
  label: ReactNode;
  disabled?: boolean;
}

export interface AnimatedTabsProps<TValue extends string> {
  value: TValue;
  items: AnimatedTabItem<TValue>[];
  onValueChange: (value: TValue) => void;
  variant?: 'page' | 'content';
  ariaLabel?: string;
  trailing?: ReactNode;
  className?: string;
}

interface IndicatorRect {
  left: number;
  width: number;
  ready: boolean;
}

export function AnimatedTabs<TValue extends string>({
  value,
  items,
  onValueChange,
  variant = 'page',
  ariaLabel,
  trailing,
  className,
}: AnimatedTabsProps<TValue>) {
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<TValue, HTMLButtonElement>());
  const [indicator, setIndicator] = useState<IndicatorRect>({ left: 0, width: 0, ready: false });
  const enabledItems = useMemo(() => items.filter((item) => !item.disabled), [items]);
  const itemsKey = items.map((item) => item.value).join('|');

  const updateIndicator = useCallback(() => {
    const trigger = triggerRefs.current.get(value);
    if (!trigger) return;
    setIndicator({
      left: trigger.offsetLeft,
      width: trigger.offsetWidth,
      ready: true,
    });
  }, [value]);

  useLayoutEffect(() => {
    updateIndicator();
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(list);
    for (const trigger of triggerRefs.current.values()) {
      observer.observe(trigger);
    }
    return () => observer.disconnect();
  }, [itemsKey, updateIndicator]);

  const focusTab = (nextValue: TValue) => {
    triggerRefs.current.get(nextValue)?.focus();
    onValueChange(nextValue);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, item: AnimatedTabItem<TValue>) => {
    const currentIndex = enabledItems.findIndex((enabledItem) => enabledItem.value === item.value);
    if (currentIndex < 0) return;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const nextItem = enabledItems[(currentIndex + 1) % enabledItems.length];
      if (nextItem) focusTab(nextItem.value);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextItem = enabledItems[(currentIndex - 1 + enabledItems.length) % enabledItems.length];
      if (nextItem) focusTab(nextItem.value);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      const firstItem = enabledItems[0];
      if (firstItem) focusTab(firstItem.value);
    }
    if (event.key === 'End') {
      event.preventDefault();
      const lastItem = enabledItems[enabledItems.length - 1];
      if (lastItem) focusTab(lastItem.value);
    }
  };

  return (
    <div
      data-slot="animated-tabs"
      data-variant={variant}
      className={cn(
        'flex items-end border-b border-border',
        variant === 'page' && 'px-6 pt-[calc(18px*var(--app-scale))]',
        variant === 'content' && 'px-0',
        className,
      )}
    >
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          'relative flex items-end',
          variant === 'page' && 'gap-7',
          variant === 'content' && 'gap-6',
        )}
      >
        {items.map((item) => {
          const active = value === item.value;
          return (
            <button
              key={item.value}
              ref={(node) => {
                if (node) {
                  triggerRefs.current.set(item.value, node);
                } else {
                  triggerRefs.current.delete(item.value);
                }
              }}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={item.disabled}
              data-state={active ? 'active' : 'inactive'}
              className={cn(
                'relative z-10 border-b-2 border-transparent outline-none transition-colors focus-visible:ring-[calc(3px*var(--app-scale))] focus-visible:ring-soft disabled:cursor-not-allowed disabled:opacity-50',
                variant === 'page' && 'px-1 pb-3 text-[calc(15px*var(--app-scale))]',
                variant === 'content' && 'px-1 pb-2.5 text-sm',
                active ? 'border-pri font-semibold text-pri' : 'border-transparent font-normal text-text-2 hover:text-text',
              )}
              onClick={() => onValueChange(item.value)}
              onKeyDown={(event) => onKeyDown(event, item)}
            >
              {item.label}
            </button>
          );
        })}
        <span
          data-slot="animated-tabs-indicator"
          aria-hidden="true"
          className={cn(
            'absolute bottom-0 h-[calc(2px*var(--app-scale))] rounded-full bg-pri opacity-0 transition-[transform,width,opacity] duration-200 ease-out motion-reduce:transition-none',
            indicator.ready && 'opacity-100',
          )}
          style={{
            width: `${indicator.width}px`,
            transform: `translateX(${indicator.left}px)`,
          }}
        />
      </div>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}
