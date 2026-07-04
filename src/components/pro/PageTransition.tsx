import { useLocation } from '@tanstack/react-router';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useAppearance } from '@/stores/appearance';

// 页面过渡容器保持稳定，避免菜单或 search 导航时把内容区当整页重建。
// 用 style.animation（原型 pageTransStyle L4827-4828）而非 Tailwind 任意值，避开 cubic-bezier 逗号解析。
const ANIM: Record<string, string> = {
  none: '',
  fade: 'pg-fade .32s ease',
  slide: 'pg-slide .34s cubic-bezier(.22,.61,.36,1)',
  up: 'pg-up .34s cubic-bezier(.22,.61,.36,1)',
  scale: 'pg-scale .3s cubic-bezier(.22,.61,.36,1)',
};

export function PageTransition({ children }: { children: ReactNode }) {
  const anim = useAppearance((s) => s.pageAnim);
  const { pathname } = useLocation();
  const frameRef = useRef<HTMLDivElement>(null);
  const animation = ANIM[anim] || '';

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    if (!animation) {
      frame.style.animation = '';
      return;
    }

    // 保持节点不重挂载，通过重置 animation 触发同一容器的进场动画。
    frame.style.animation = 'none';
    void frame.offsetHeight;
    frame.style.animation = animation;
  }, [animation, pathname]);

  return (
    <div ref={frameRef} style={{ animation: animation || undefined }}>
      {children}
    </div>
  );
}
