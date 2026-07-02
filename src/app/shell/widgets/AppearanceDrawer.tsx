import { Palette, Check, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAppearance } from '@/stores/appearance';
import {
  ACCENTS,
  FLAVOR_PRESETS,
  CUSTOM_ACCENT_GRADIENT,
  isValidHex,
  type Flavor,
  type Zoom,
  type Radius,
} from '@/lib/appearance-dom';

const RING = (color: string) => `0 0 0 2px var(--surface), 0 0 0 4px ${color}`;
const OUTLINE = 'inset 0 0 0 1px rgba(128,128,128,.14)';

const FLAVOR_OPTS = [
  { key: 'feishu', preset: FLAVOR_PRESETS[0], label: 'flavorFeishu', desc: 'flavorFeishuDesc' },
  { key: 'claude', preset: FLAVOR_PRESETS[1], label: 'flavorClaude', desc: 'flavorClaudeDesc' },
] as const;
const ANIM_OPTS = ['none', 'fade', 'slide', 'up', 'scale'] as const;
const ANIM_LABEL: Record<string, string> = {
  none: 'animNone',
  fade: 'animFade',
  slide: 'animSlide',
  up: 'animUp',
  scale: 'animScale',
};
const ZOOM_OPTS: { key: Zoom; label: string; hint: string }[] = [
  { key: 'sm', label: 'zoomSm', hint: 'zoomSmHint' },
  { key: 'md', label: 'zoomMd', hint: 'zoomMdHint' },
  { key: 'lg', label: 'zoomLg', hint: 'zoomLgHint' },
];
// 圆角预览用具体 px（原型 radiusOptions L4972）——内联 style 消费，非 rounded-[] 任意类
const RADIUS_OPTS: { key: Radius; label: string; r: string }[] = [
  { key: 'sharp', label: 'radiusSharp', r: '3px' },
  { key: 'default', label: 'radiusDefault', r: '8px' },
  { key: 'round', label: 'radiusRound', r: '14px' },
];

function SectionTitle({ children }: { children: string }) {
  return <div className="mb-2.5 mt-6 text-[13px] font-semibold text-text-2">{children}</div>;
}

export function AppearanceDrawer() {
  const { t } = useTranslation();
  const flavor = useAppearance((s) => s.flavor);
  const accent = useAppearance((s) => s.accent);
  const customAccent = useAppearance((s) => s.customAccent);
  const layout = useAppearance((s) => s.layout);
  const pageAnim = useAppearance((s) => s.pageAnim);
  const zoom = useAppearance((s) => s.zoom);
  const radius = useAppearance((s) => s.radius);
  const set = useAppearance((s) => s.set);
  const setFlavor = useAppearance((s) => s.setFlavor);

  const dk = (k: string) => t(`shell.appearanceDrawer.${k}`);

  return (
    <Sheet>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-text-2" aria-label={dk('title')}>
              <Palette className="size-5" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('shell.appearance')}</TooltipContent>
      </Tooltip>
      <SheetContent side="right" className="w-[380px] max-w-[90vw] gap-0 overflow-y-auto">
        <SheetHeader className="gap-1 p-6 pb-2">
          <SheetTitle className="text-lg font-bold">{dk('title')}</SheetTitle>
          <SheetDescription className="text-[13px] text-text-3">{dk('subtitle')}</SheetDescription>
        </SheetHeader>

        <div className="px-6 pb-8">
          {/* 界面风格 */}
          <SectionTitle>{dk('flavor')}</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {FLAVOR_OPTS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFlavor(f.key as Flavor)}
                className={cn(
                  'flex items-center gap-3 rounded-11 border p-2.5 text-left transition-colors',
                  flavor === f.key ? 'border-pri bg-pri-soft' : 'border-border bg-surface',
                )}
              >
                <span
                  className="flex shrink-0 gap-1 rounded-9 p-2"
                  style={{ background: f.preset.chrome }}
                >
                  <span className="size-[15px] rounded-5" style={{ background: f.preset.pri }} />
                  <span
                    className="size-[15px] rounded-5 border border-border"
                    style={{ background: f.preset.chrome }}
                  />
                  <span className="size-[15px] rounded-5" style={{ background: f.preset.surface2 }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-text">{dk(f.label)}</div>
                  <div className="text-xs text-text-3">{dk(f.desc)}</div>
                </div>
                {flavor === f.key && <Check className="size-[17px] shrink-0 text-pri" />}
              </button>
            ))}
          </div>

          {/* 导航布局 */}
          <SectionTitle>{dk('layout')}</SectionTitle>
          <div className="grid grid-cols-3 gap-2.5">
            {(['sidebar', 'rail', 'inset'] as const).map((k) => (
              <button
                key={k}
                onClick={() => set({ layout: k })}
                className={cn(
                  'relative flex flex-col gap-2 rounded-12 border p-2 transition-colors',
                  layout === k ? 'border-pri bg-pri-soft' : 'border-border bg-surface-2',
                )}
              >
                <LayoutThumb kind={k} />
                <div className="text-center">
                  <div className="text-xs font-semibold text-text">
                    {dk(`layout${k[0]!.toUpperCase()}${k.slice(1)}`)}
                  </div>
                  <div className="text-[10px] text-text-3">
                    {dk(`layout${k[0]!.toUpperCase()}${k.slice(1)}Desc`)}
                  </div>
                </div>
                {layout === k && (
                  <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-pri">
                    <Check className="size-2.5 text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 主题色 */}
          <SectionTitle>{dk('accent')}</SectionTitle>
          <div className="grid grid-cols-5 gap-2.5">
            {ACCENTS.map((a) => (
              <button
                key={a.key}
                onClick={() => set({ accent: a.key })}
                className="flex flex-col items-center gap-1.5"
              >
                <span
                  className="flex h-11 w-full items-center justify-center rounded-11 transition-transform"
                  style={{ background: a.pri, boxShadow: accent === a.key ? RING(a.pri) : OUTLINE }}
                >
                  {accent === a.key && <Check className="size-[17px] text-white" />}
                </span>
                <span className="text-[10px] text-text-3">{a.label}</span>
              </button>
            ))}
            <label className="flex cursor-pointer flex-col items-center gap-1.5">
              <span
                className="relative flex h-11 w-full items-center justify-center rounded-11"
                style={{
                  background: accent === 'custom' ? customAccent : CUSTOM_ACCENT_GRADIENT,
                  boxShadow: accent === 'custom' ? RING(customAccent) : OUTLINE,
                }}
              >
                {accent === 'custom' ? (
                  <Check className="size-4 text-white" />
                ) : (
                  <Plus className="size-4 text-white" />
                )}
                <input
                  type="color"
                  value={isValidHex(customAccent) ? customAccent : ACCENTS[0].pri}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (isValidHex(v)) set({ accent: 'custom', customAccent: v });
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </span>
              <span className="text-[10px] text-text-3">{dk('accentCustom')}</span>
            </label>
          </div>

          {/* 页面切换动画 */}
          <SectionTitle>{dk('pageAnim')}</SectionTitle>
          <div className="flex gap-2">
            {ANIM_OPTS.map((k) => (
              <button
                key={k}
                onClick={() => set({ pageAnim: k })}
                className={cn(
                  'h-9 flex-1 rounded-8 border text-[13px] transition-colors',
                  pageAnim === k
                    ? 'border-pri bg-pri-soft font-semibold text-pri'
                    : 'border-border bg-surface text-text-2',
                )}
              >
                {dk(ANIM_LABEL[k]!)}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-text-3">{dk('pageAnimHint')}</div>

          {/* 显示比例 */}
          <SectionTitle>{dk('zoom')}</SectionTitle>
          <div className="flex gap-2">
            {ZOOM_OPTS.map((o) => (
              <button
                key={o.key}
                onClick={() => set({ zoom: o.key })}
                className={cn(
                  'flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-9 border transition-colors',
                  zoom === o.key
                    ? 'border-pri bg-pri-soft text-pri'
                    : 'border-border bg-surface text-text-2',
                )}
              >
                <span className="text-sm font-semibold">{dk(o.label)}</span>
                <span className="text-[11px] opacity-70">{dk(o.hint)}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-text-3">{dk('zoomHint')}</div>

          {/* 圆角风格 */}
          <SectionTitle>{dk('radius')}</SectionTitle>
          <div className="flex gap-2">
            {RADIUS_OPTS.map((o) => (
              <button
                key={o.key}
                onClick={() => set({ radius: o.key })}
                className={cn(
                  'flex h-[76px] flex-1 flex-col items-center justify-center gap-2 rounded-9 border text-[13px] transition-colors',
                  radius === o.key
                    ? 'border-pri bg-pri-soft text-pri'
                    : 'border-border bg-surface text-text-2',
                )}
              >
                <span
                  className="size-[34px] border-2"
                  style={{
                    borderColor: radius === o.key ? 'var(--pri)' : 'var(--text-3)',
                    borderTopLeftRadius: o.r,
                    background: radius === o.key ? 'var(--pri-soft)' : 'transparent',
                  }}
                />
                <span>{dk(o.label)}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-text-3">{dk('radiusHint')}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// 布局缩略图（原型 L2681-2734 的简化版）：用 token 色块示意三种布局的骨架
function LayoutThumb({ kind }: { kind: 'sidebar' | 'rail' | 'inset' }) {
  if (kind === 'sidebar') {
    return (
      <div className="flex h-14 overflow-hidden rounded-sm border border-border">
        <div className="w-[34%] border-r border-border bg-surface p-1">
          <div className="h-1 rounded-full bg-pri" />
          <div className="mt-1 h-1 rounded-full bg-border" />
          <div className="mt-1 h-1 rounded-full bg-border" />
        </div>
        <div className="flex-1 bg-bg">
          <div className="h-3 border-b border-border bg-surface" />
        </div>
      </div>
    );
  }
  if (kind === 'rail') {
    return (
      <div className="flex h-14 overflow-hidden rounded-sm border border-border">
        <div className="flex w-[16%] flex-col items-center gap-1 bg-surface py-1">
          <div className="size-1 rounded-full bg-pri" />
          <div className="size-1 rounded-full bg-border" />
        </div>
        <div className="w-[28%] border-x border-border bg-surface p-1">
          <div className="h-1 rounded-full bg-border" />
          <div className="mt-1 h-1 rounded-full bg-border" />
        </div>
        <div className="flex-1 bg-bg">
          <div className="h-3 border-b border-border bg-surface" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-14 gap-1 rounded-sm border border-border bg-canvas p-1">
      <div className="w-[28%] pt-0.5">
        <div className="h-1 rounded-full bg-pri" />
        <div className="mt-1 h-1 rounded-full bg-text-3 opacity-40" />
      </div>
      <div className="flex-1 rounded-sm border border-border bg-surface shadow-sm" />
    </div>
  );
}
