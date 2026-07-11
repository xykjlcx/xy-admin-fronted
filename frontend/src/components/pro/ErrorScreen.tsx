import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';

export interface ErrorScreenProps {
  code: '403' | '404' | '500';
  title: string;
  description?: string;
  backHomeLabel: string;
  homeTo: string;
  // 运行时错误兜底用：传入则渲染「重试」按钮（403/404 这类静态错误不传）
  retryLabel?: string;
  onRetry?: () => void;
}

// ErrorScreen 只承载错误页展示结构；文案与跳转目标由调用方注入，避免 pro 层绑定 i18n/config。
export function ErrorScreen({
  code,
  title,
  description,
  backHomeLabel,
  homeTo,
  retryLabel,
  onRetry,
}: ErrorScreenProps) {
  return (
    <div className="flex h-full min-h-[calc(400px*var(--app-scale))] flex-col items-center justify-center gap-3">
      <div className="text-[calc(64px*var(--app-scale))] font-bold text-text-3">{code}</div>
      <p className="text-text-2">{title}</p>
      {description && <p className="text-sm text-text-3">{description}</p>}
      <div className="mt-2 flex items-center gap-3">
        {onRetry && retryLabel && (
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        )}
        <Link to={homeTo} className="text-(--button-link-fg)">
          {backHomeLabel}
        </Link>
      </div>
    </div>
  );
}
