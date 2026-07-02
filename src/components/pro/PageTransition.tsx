import { useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useAppearance } from '@/stores/appearance';

// 切页动画：key={pathname} 使路由变化时 div 重挂载并重放动画（keyframes 见 global.css，Task 2）。
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
  return (
    <div key={pathname} style={{ animation: ANIM[anim] || undefined }}>
      {children}
    </div>
  );
}
