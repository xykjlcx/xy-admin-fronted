import { useMatches } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// 面包屑：从匹配链最深处取 staticData（group / label）。
// M0 用 staticData 兜底（spec §8.3）；M1 命中菜单树时改用菜单 lv(label)。
// 本组件已就绪供页面头部消费，M0 布局暂未挂载（原型顶栏无面包屑）。
export function Breadcrumb() {
  const { t } = useTranslation('admin');
  const matches = useMatches();
  const leaf = [...matches]
    .reverse()
    .find((m) => {
      const data = m.staticData as { label?: string; labelKey?: string } | undefined;
      return data?.labelKey || data?.label;
    });
  const sd = leaf?.staticData as { label?: string; labelKey?: string; group?: string; groupKey?: string } | undefined;
  const label = sd?.labelKey ? t(sd.labelKey) : sd?.label;
  const group = sd?.groupKey ? t(sd.groupKey) : sd?.group;
  if (!label) return null;
  return (
    <nav className="flex items-center gap-1.5 text-[calc(13px*var(--app-scale))] text-text-3">
      {group && (
        <>
          <span>{group}</span>
          <ChevronRight className="size-3.5" />
        </>
      )}
      <span className="text-text">{label}</span>
    </nav>
  );
}
