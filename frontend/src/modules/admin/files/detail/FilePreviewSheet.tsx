import { Download, FileText, Link, Pencil, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/pro/QueryState';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { fileDetailQuery } from '../api';
import { formatFileSize } from '../model';

export function FilePreviewSheet({
  fileId,
  permissions,
  labels,
  onOpenChange,
  onDownload,
  onRename,
  onDelete,
  onShare,
  downloading = false,
  sharing = false,
}: {
  fileId: string;
  permissions: { download: boolean; rename: boolean; delete: boolean; share: boolean };
  labels: {
    previewDescription: string;
    download: string;
    rename: string;
    share: string;
    delete: string;
    imagePreview: string;
    documentPreview: string;
    type: string;
    size: string;
    owner: string;
    date: string;
    folderUnit: string;
    loading: string;
    loadFailed: string;
    retry: string;
  };
  onOpenChange: (open: boolean) => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
  onShare: () => void;
  downloading?: boolean;
  sharing?: boolean;
}) {
  const detail = useQuery(fileDetailQuery(fileId));
  const file = detail.data;
  return (
    <Sheet open={fileId.length > 0} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[calc(640px*var(--app-scale))]" aria-describedby={undefined}>
        {!file && fileId && (
          <QueryState
            data={file}
            pending={detail.isPending}
            error={detail.isError}
            loadingLabel={labels.loading}
            errorLabel={labels.loadFailed}
            retryLabel={labels.retry}
            onRetry={() => void detail.refetch()}
          >
            {() => null}
          </QueryState>
        )}
        {file && (
          <>
            <SheetHeader className="border-b border-(--overlay-border) pr-16">
              <SheetTitle>{file.name}</SheetTitle>
              <SheetDescription>{labels.previewDescription}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-wrap gap-2 px-4">
              {permissions.download && (
                <Button variant="outline" size="sm" loading={downloading} onClick={onDownload}>
                  <Download data-icon="inline-start" />
                  {labels.download}
                </Button>
              )}
              {permissions.rename && (
                <Button variant="outline" size="sm" onClick={onRename}>
                  <Pencil data-icon="inline-start" />
                  {labels.rename}
                </Button>
              )}
              {permissions.share && (
                <Button variant="outline" size="sm" loading={sharing} onClick={onShare}>
                  <Link data-icon="inline-start" />
                  {labels.share}
                </Button>
              )}
              {permissions.delete && (
                <Button variant="danger-ghost" size="sm" onClick={onDelete}>
                  <Trash2 data-icon="inline-start" />
                  {labels.delete}
                </Button>
              )}
            </div>
            <div className="m-4 flex min-h-0 flex-1 items-center justify-center rounded-12 bg-surface-2 p-4 text-center">
              <div>
                <FileText className="mx-auto size-8 text-text-3" />
                <p className="mt-2 text-sm text-text-2">
                  {file.kind === 'image' ? labels.imagePreview : labels.documentPreview}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 border-t border-(--overlay-border) p-4 text-sm">
              <div>
                <dt className="text-text-3">{labels.type}</dt>
                <dd className="mt-1 text-text">{file.kind}</dd>
              </div>
              <div>
                <dt className="text-text-3">{labels.size}</dt>
                <dd className="mt-1 text-text">{formatFileSize(file, labels.folderUnit)}</dd>
              </div>
              <div>
                <dt className="text-text-3">{labels.owner}</dt>
                <dd className="mt-1 text-text">{file.owner}</dd>
              </div>
              <div>
                <dt className="text-text-3">{labels.date}</dt>
                <dd className="mt-1 text-text">{file.updatedAt}</dd>
              </div>
            </dl>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
