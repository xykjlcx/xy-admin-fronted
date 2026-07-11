import { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
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
  return t('update.entry.error');
}

export function UpdateStatus({
  updater = platform.updater,
  autoCheck = true,
}: {
  updater?: AppPlatform['updater'];
  autoCheck?: boolean;
}) {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<UpdateSnapshot | null>(null);
  const [open, setOpen] = useState(false);
  const [commandPending, setCommandPending] = useState(false);

  useEffect(() => {
    if (!updater.supported) return;
    let active = true;
    const unsubscribe = updater.subscribe((next) => {
      if (active) setSnapshot(next);
    });
    void updater.getSnapshot().then((next) => {
      if (active) setSnapshot(next);
    });

    const check = () => {
      if (!autoCheck || !navigator.onLine) return;
      void updater.check().then((result) => {
        if (active && result.ok) setSnapshot(result.snapshot);
      });
    };
    check();
    window.addEventListener('online', check);
    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('online', check);
    };
  }, [autoCheck, updater]);

  if (!updater.supported) return null;

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

  const visible = snapshot && ['available', 'downloading', 'downloaded', 'error'].includes(snapshot.status);
  const targetVersion = snapshot?.targetVersion;
  const versionSummary = targetVersion
    ? `${snapshot.currentVersion} → ${targetVersion}`
    : snapshot?.currentVersion;

  return (
    <>
      {visible && snapshot && (
        <Button
          variant="outline"
          size="sm"
          aria-label={entryLabel(snapshot, t)}
          onClick={() => setOpen(true)}
        >
          {snapshot.status === 'error' ? <RefreshCw /> : <Download />}
          <span className="max-lg:hidden">{entryLabel(snapshot, t)}</span>
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('update.title')}</DialogTitle>
            <DialogDescription>{versionSummary}</DialogDescription>
          </DialogHeader>
          {snapshot && (
            <div className="grid gap-4 text-sm">
              {snapshot.releaseDate && (
                <div>
                  <div className="font-medium">{t('update.releaseDate')}</div>
                  <div>{new Date(snapshot.releaseDate).toLocaleString()}</div>
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
