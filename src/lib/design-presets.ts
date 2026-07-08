// src/lib/design-presets.ts —— 视觉轴「设计预设」数据层。
// 一套预设 = 视觉轴的完整取值（flavor + accent + radius + scale）；
// 刻意不含 layout / pageAnim —— 那是 Shell 结构轴，不进视觉预设（PRD §6.2）。
// accent 复用 flavorDefaultAccent 作单一真相源，避免与 appearance-dom 的默认色表 drift。
import { flavorDefaultAccent, type AccentKey, type Flavor, type Radius, type Zoom } from './appearance-dom';

export interface DesignPreset {
  readonly flavor: Flavor;
  readonly accent: AccentKey;
  readonly radius: Radius;
  // 命名对齐 PRD 的 zoom→scale 语义；store 侧字段仍叫 zoom，applyPreset 处做映射。
  readonly scale: Zoom;
}

function presetFor(flavor: Flavor): DesignPreset {
  return Object.freeze({ flavor, accent: flavorDefaultAccent(flavor), radius: 'default', scale: 'md' });
}

export const DESIGN_PRESETS: Readonly<Record<Flavor, DesignPreset>> = Object.freeze({
  feishu: presetFor('feishu'),
  claude: presetFor('claude'),
  shadcn: presetFor('shadcn'),
  sera: presetFor('sera'),
});

export function presetToPatch(key: Flavor): DesignPreset {
  return { ...DESIGN_PRESETS[key] };
}
