import * as React from 'react';
import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        // 排印 transform/tracking 走 --label-* 挂点（默认 none/normal，sera 批2 兑现 uppercase）。
        // peer 豁免（收窄版 D3）：挨 checkbox/radio-group-item/switch 的 label 只撤 transform+tracking 两条，
        // 绝不含 text-sm/font-normal——否则 size/weight 联动会碾压全 flavor label 自身类，就地回归。
        'flex items-center gap-2 text-xs leading-none font-medium text-text-2 [text-transform:var(--label-transform)] [letter-spacing:var(--label-tracking)] select-none data-[error=true]:text-danger group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-data-[slot=checkbox]:[text-transform:none] peer-data-[slot=checkbox]:[letter-spacing:normal] peer-data-[slot=radio-group-item]:[text-transform:none] peer-data-[slot=radio-group-item]:[letter-spacing:normal] peer-data-[slot=switch]:[text-transform:none] peer-data-[slot=switch]:[letter-spacing:normal]',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
