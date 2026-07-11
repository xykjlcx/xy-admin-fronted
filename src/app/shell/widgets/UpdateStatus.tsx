import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProgressBar } from '@/components/ui/progress';
import { platform, type AppPlatform, type UpdateSnapshot } from '@/lib/platform';

function formatBytes(value: number): string {
  if (value < 1024) return `${String(value)} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function entryLabel(snapshot: UpdateSnapshot, t: ReturnType<typeof useTranslation>['t']): string {
  if (snapshot.status === 'available') {
    return t('update.entry.available', { version: snapshot.targetVersion });
  }
  if (snapshot.status === 'downloading') {
    return t('update.entry.downloading', { percent: Math.round(snapshot.percent) });
  }
  if (snapshot.status === 'downloaded') return t('update.entry.downloaded');
  if (snapshot.status === 'checking') return t('update.entry.checking');
  if (snapshot.status === 'installing') return t('update.entry.installing');
  if (snapshot.status === 'cancelled') return t('update.entry.cancelled');
  if (snapshot.status === 'error') return t('update.entry.error');
  return t('update.actions.check');
}

export interface UpdateStatusEntry {
  supported: boolean;
  label: string;
  status: UpdateSnapshot['status'] | null;
  pending: boolean;
  activate(): void;
}

export function UpdateStatus({
  children,
  updater = platform.updater,
  autoCheck = true,
}: {
  children: (entry: UpdateStatusEntry) => ReactNode;
  updater?: AppPlatform['updater'];
  autoCheck?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [snapshot, setSnapshot] = useState<UpdateSnapshot | null>(null);
  const [open, setOpen] = useState(false);
  const [commandPending, setCommandPending] = useState(false);

  useEffect(() => {
    if (!updater.supported) return;
    let active = true;
    let failureReported = false;
    const reportAdapterFailure = () => {
      if (!active || failureReported) return;
      failureReported = true;
      toast.error(t('update.commandFailed'));
    };
    const unsubscribe = updater.subscribe((next) => {
      if (active) setSnapshot(next);
    });
    void updater
      .getSnapshot()
      .then((next) => {
        if (active) setSnapshot(next);
      })
      .catch(reportAdapterFailure);

    const check = () => {
      if (!autoCheck || !navigator.onLine) return;
      void updater
        .check()
        .then((result) => {
          if (active && result.ok) setSnapshot(result.snapshot);
        })
        .catch(reportAdapterFailure);
    };
    check();
    window.addEventListener('online', check);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('online', check);
    };
  }, [autoCheck, t, updater]);

  const runCommand = async (command: 'download' | 'cancelDownload' | 'install' | 'retry'): Promise<void> => {
    setCommandPending(true);
    try {
      const result = await updater[command]();
      if (result.ok) setSnapshot(result.snapshot);
      else toast.error(t('update.commandRejected'));
    } catch {
      toast.error(t('update.commandFailed'));
    } finally {
      setCommandPending(false);
    }
  };

  const checkManually = async (): Promise<void> => {
    setCommandPending(true);
    try {
      const result = await updater.check();
      if (!result.ok) {
        toast.error(t('update.commandRejected'));
        return;
      }
      setSnapshot(result.snapshot);
      if (result.snapshot.status === 'upToDate') toast.success(t('update.upToDate'));
      if (['available', 'error'].includes(result.snapshot.status)) setOpen(true);
    } catch {
      toast.error(t('update.commandFailed'));
    } finally {
      setCommandPending(false);
    }
  };

  const activate = () => {
    if (!updater.supported || commandPending || snapshot?.status === 'checking') return;
    if (!snapshot || snapshot.status === 'idle' || snapshot.status === 'upToDate') {
      void checkManually();
      return;
    }
    setOpen(true);
  };
  const entry = children({
    supported: updater.supported,
    label: snapshot ? entryLabel(snapshot, t) : t('update.actions.check'),
    status: snapshot?.status ?? null,
    pending: commandPending || snapshot?.status === 'checking',
    activate,
  });

  if (!updater.supported) return <>{entry}</>;

  const targetVersion = snapshot?.targetVersion;
  const versionSummary = targetVersion
    ? `${snapshot.currentVersion} → ${targetVersion}`
    : snapshot?.currentVersion;

  return (
    <>
      {entry}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          closeLabel={t('actions.close')}
          className="max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]"
        >
          <DialogHeader>
            <DialogTitle>{t('update.title')}</DialogTitle>
            <DialogDescription>{versionSummary}</DialogDescription>
          </DialogHeader>
          {snapshot && (
            <div data-slot="update-dialog-body" className="grid min-h-0 gap-4 overflow-y-auto text-sm">
              {snapshot.releaseDate && (
                <div>
                  <div className="font-medium">{t('update.releaseDate')}</div>
                  <div>{new Date(snapshot.releaseDate).toLocaleString(i18n.language)}</div>
                </div>
              )}
              {snapshot.releaseNotes && (
                <div>
                  <div className="font-medium">{t('update.releaseNotes')}</div>
                  <div className="whitespace-pre-wrap">{snapshot.releaseNotes}</div>
                </div>
              )}
              {snapshot.packageSize !== null && (
                <div>
                  {t('update.packageSize')}: {formatBytes(snapshot.packageSize)}
                </div>
              )}
              {snapshot.status === 'downloading' && (
                <div className="grid gap-2">
                  <ProgressBar value={snapshot.percent} max={100} aria-label={t('update.downloadProgress')} />
                  <div className="flex justify-between text-xs">
                    <span>
                      {formatBytes(snapshot.transferred)} / {formatBytes(snapshot.total)}
                    </span>
                    <span>
                      {Math.round(snapshot.percent)}% · {formatBytes(snapshot.bytesPerSecond)}/s
                    </span>
                  </div>
                </div>
              )}
              {snapshot.status === 'error' && snapshot.errorCode && (
                <div role="alert">{t(`update.errors.${snapshot.errorCode}`)}</div>
              )}
            </div>
          )}
          <DialogFooter>
            {snapshot?.status === 'available' && (
              <Button loading={commandPending} onClick={() => void runCommand('download')}>
                {t('update.actions.download')}
              </Button>
            )}
            {snapshot?.status === 'downloading' && (
              <Button
                variant="outline"
                loading={commandPending}
                onClick={() => void runCommand('cancelDownload')}
              >
                {t('update.actions.cancel')}
              </Button>
            )}
            {snapshot?.status === 'downloaded' && (
              <Button loading={commandPending} onClick={() => void runCommand('install')}>
                {t('update.actions.install')}
              </Button>
            )}
            {(snapshot?.status === 'error' || snapshot?.status === 'cancelled') && snapshot.retryable && (
              <Button loading={commandPending} onClick={() => void runCommand('retry')}>
                {t('update.actions.retry')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
