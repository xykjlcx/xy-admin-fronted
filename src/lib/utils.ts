import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn 标准 className 合并工具：clsx 处理条件类，tailwind-merge 消解冲突类
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
