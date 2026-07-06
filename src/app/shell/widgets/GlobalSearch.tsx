import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SearchField } from '@/components/pro/SearchField';
import { featuresConfig } from '@/config';

// 全局搜索：M0 仅 UI（440px 居中输入框，聚焦弹 toast），真实搜索 M1 接入。
// 未接真前只在开发/demo 显示，生产交付隐藏避免露假功能（诊断 F8）。
export function GlobalSearch() {
  const { t } = useTranslation();
  if (!featuresConfig.showStubChrome) return null;
  return (
    <SearchField
      readOnly
      aria-label={t('shell.search')}
      placeholder={t('shell.search')}
      containerClassName="h-9 w-[calc(440px*var(--app-scale))] max-w-[34vw]"
      onFocus={(event) => {
        event.currentTarget.blur();
        toast(t('shell.toast.search'));
      }}
    />
  );
}
