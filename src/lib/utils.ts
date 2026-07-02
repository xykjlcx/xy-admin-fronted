import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// 圆角数字全档（rounded-4…rounded-14，见 tokens.css / global.css）是自定义 scale，
// 原生 tailwind-merge 不认识它们 → 无法与 rounded-sm/md/lg/xl/full 归为同一 border-radius 冲突组，
// 于是 `rounded-full rounded-11` 两个类共存、由 CSS 生成顺序决定胜负（常常旧类赢，圆角失效）。
// 把数字档并入 'rounded' classGroup，让 cn() 能正确去重（同组后者胜）。
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ rounded: ['4', '5', '6', '7', '8', '9', '10', '11', '12', '14'] }],
    },
  },
});

// shadcn 标准 className 合并工具：clsx 处理条件类，tailwind-merge 消解冲突类
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
