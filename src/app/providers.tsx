import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { queryClient } from './query';

// 全局 Provider 组合点：Query（服务端数据）+ Tooltip（Header 图标提示）+ Toaster（sonner 全局挂载点）
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster position="top-center" closeButton />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
