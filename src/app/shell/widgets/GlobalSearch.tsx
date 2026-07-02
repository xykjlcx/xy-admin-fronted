import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// 全局搜索：M0 仅 UI（440px 居中输入框，聚焦弹 toast），真实搜索 M1 接入
export function GlobalSearch() {
  const { t } = useTranslation();
  return (
    <div className="flex h-9 w-[440px] max-w-[34vw] items-center gap-2 rounded-8 bg-surface-2 px-3">
      <Search className="size-4 shrink-0 text-text-3" />
      <input
        readOnly
        onFocus={(e) => {
          e.currentTarget.blur();
          toast(t('shell.toast.search'));
        }}
        placeholder={t('shell.search')}
        className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-text outline-none placeholder:text-text-3"
      />
    </div>
  );
}
