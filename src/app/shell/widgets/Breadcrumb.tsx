import { useMatches } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';

// 面包屑：从匹配链最深处取 staticData（group / label）。
// M0 用 staticData 兜底（spec §8.3）；M1 命中菜单树时改用菜单 lv(label)。
// 本组件已就绪供页面头部消费，M0 布局暂未挂载（原型顶栏无面包屑）。
export function Breadcrumb() {
  const matches = useMatches();
  const leaf = [...matches]
    .reverse()
    .find((m) => (m.staticData as { label?: string } | undefined)?.label);
  const sd = leaf?.staticData as { label?: string; group?: string } | undefined;
  if (!sd?.label) return null;
  return (
    <nav className="flex items-center gap-1.5 text-[13px] text-text-3">
      {sd.group && (
        <>
          <span>{sd.group}</span>
          <ChevronRight className="size-3.5" />
        </>
      )}
      <span className="text-text">{sd.label}</span>
    </nav>
  );
}
