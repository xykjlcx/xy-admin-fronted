import { lv, mergeLocalized } from '@/lib/localized';

test('取当前语言', () => expect(lv({ 'zh-CN': '运单', 'en-US': 'Shipments' }, 'en-US')).toBe('Shipments'));
test('缺失回退 zh-CN', () => expect(lv({ 'zh-CN': '运单' }, 'en-US')).toBe('运单'));
test('再缺回退首个非空', () => expect(lv({ 'ja-JP': '運送' }, 'en-US')).toBe('運送'));
test('空对象返回空串', () => expect(lv({}, 'zh-CN')).toBe(''));
test('当前语言空串视同缺失，回退 zh-CN', () => expect(lv({ 'en-US': '', 'zh-CN': '运单' }, 'en-US')).toBe('运单'));
test('zh-CN 也空串，回退首个非空', () => expect(lv({ 'en-US': '', 'zh-CN': '', 'ja-JP': 'x' }, 'en-US')).toBe('x'));

test('mergeLocalized 编辑只改当前 locale，保留其他语言', () =>
  expect(mergeLocalized({ 'zh-CN': '工作台', 'en-US': 'Workspace' }, 'zh-CN', '控制台')).toEqual({
    'zh-CN': '控制台',
    'en-US': 'Workspace',
  }));
test('mergeLocalized 英文界面写入 en-US，不覆盖 zh-CN', () =>
  expect(mergeLocalized({ 'zh-CN': '工作台' }, 'en-US', 'Console')).toEqual({
    'zh-CN': '工作台',
    'en-US': 'Console',
  }));
test('mergeLocalized 创建（无原值）只写当前 locale', () =>
  expect(mergeLocalized(undefined, 'en-US', 'Console')).toEqual({ 'en-US': 'Console' }));
test('mergeLocalized 清空当前 locale 只删该键，保留其他语言', () =>
  expect(mergeLocalized({ 'zh-CN': '工作台', 'en-US': 'Workspace' }, 'en-US', '   ')).toEqual({
    'zh-CN': '工作台',
  }));
test('mergeLocalized 写入前 trim 首尾空白', () =>
  expect(mergeLocalized(undefined, 'zh-CN', '  控制台  ')).toEqual({ 'zh-CN': '控制台' }));
