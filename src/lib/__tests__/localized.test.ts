import { lv } from '@/lib/localized';

test('取当前语言', () => expect(lv({ 'zh-CN': '运单', 'en-US': 'Shipments' }, 'en-US')).toBe('Shipments'));
test('缺失回退 zh-CN', () => expect(lv({ 'zh-CN': '运单' }, 'en-US')).toBe('运单'));
test('再缺回退首个非空', () => expect(lv({ 'ja-JP': '運送' }, 'en-US')).toBe('運送'));
test('空对象返回空串', () => expect(lv({}, 'zh-CN')).toBe(''));
