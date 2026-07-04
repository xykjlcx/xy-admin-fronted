import { History, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoleLogDto } from '@/modules/admin/api/role.api';
import { avatarClasses, logToneClass } from './model';

export function RoleLogsPanel({ logs }: { logs: RoleLogDto[] }) {
  return (
    <div className="overflow-hidden rounded-12 border border-border">
      {logs.map((log, index) => (
        <div
          key={log.id}
          className="flex items-center gap-3 border-b border-border px-[calc(18px*var(--app-scale))] py-4 last:border-b-0"
        >
          <div
            className={cn(
              'flex size-[calc(34px*var(--app-scale))] shrink-0 items-center justify-center rounded-full',
              logToneClass[log.kind],
            )}
          >
            {log.kind === 'create' ? <Shield className="size-4" /> : <History className="size-4" />}
          </div>
          <div
            className={cn(
              'flex size-[calc(22px*var(--app-scale))] shrink-0 items-center justify-center rounded-full text-[calc(11px*var(--app-scale))] font-semibold text-white',
              log.who === '系统' ? 'bg-text-3' : avatarClasses[index % avatarClasses.length],
            )}
          >
            {log.who.slice(-1)}
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <span className="font-semibold text-text">{log.who}</span>
            <span className="ml-1 text-text-2">{log.text}</span>
          </div>
          <span className="shrink-0 text-xs text-text-3">{log.time}</span>
        </div>
      ))}
    </div>
  );
}
