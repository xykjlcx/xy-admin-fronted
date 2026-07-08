import { describe, expect, it } from 'vitest';
import { flavorDefaultAccent, type Flavor } from '@/lib/appearance-dom';
import { DESIGN_PRESETS, presetToPatch, type DesignPreset } from '@/lib/design-presets';

const flavors: Flavor[] = ['feishu', 'claude', 'shadcn', 'sera'];

type MutableDesignPreset = {
  -readonly [Key in keyof DesignPreset]: DesignPreset[Key];
};

describe('design-presets', () => {
  it('每个 flavor 有一套完整视觉预设，accent 与 flavor 默认色一致', () => {
    for (const flavor of flavors) {
      expect(DESIGN_PRESETS[flavor]).toEqual({
        flavor,
        accent: flavorDefaultAccent(flavor),
        radius: 'default',
        scale: 'md',
      });
    }
  });

  it('presetToPatch 返回每个 flavor 的视觉轴，不含 layout/pageAnim（Shell 轴不进视觉预设）', () => {
    for (const flavor of flavors) {
      const patch = presetToPatch(flavor);
      expect(patch).toEqual(DESIGN_PRESETS[flavor]);
      expect(patch).not.toHaveProperty('layout');
      expect(patch).not.toHaveProperty('pageAnim');
    }
  });

  it('presetToPatch 返回浅拷贝，调用方突变不污染共享预设', () => {
    const patch = presetToPatch('claude') as MutableDesignPreset;

    patch.accent = 'blue';

    expect(DESIGN_PRESETS.claude.accent).toBe(flavorDefaultAccent('claude'));
    expect(presetToPatch('claude').accent).toBe(flavorDefaultAccent('claude'));
  });
});
