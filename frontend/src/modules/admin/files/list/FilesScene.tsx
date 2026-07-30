import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Folder, FolderPlus, Grid3X3, List, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { DataTable } from '@/components/pro/DataTable';
import { DataToolbar, DataToolbarGroup } from '@/components/pro/DataToolbar';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { PageFrame, PagePaneBody, PageSurface } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ProgressBar } from '@/components/ui/progress';
import { downloadFile } from '@/lib/download';
import { matchPermission } from '@/lib/permission';
import { fileApi, fileKeys, filesQuery, storageOverviewQuery, type FileEntryDto } from '../api';
import { FilePreviewSheet } from '../detail';
import { UploadFileDialog } from '../form';
import { formatFileSize } from '../model';
import { fileColumns } from './columns';

type FileView = 'grid' | 'list';
type NameDialogMode = 'folder' | 'rename' | null;
const emptyFiles: FileEntryDto[] = [];

export function FilesScene({
  permissions,
  systemAdmin = false,
  fileId,
  onFileChange,
}: {
  permissions: string[];
  systemAdmin?: boolean;
  fileId?: string;
  onFileChange?: (fileId?: string) => void;
}) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const queryClient = useQueryClient();
  const [view, setView] = useState<FileView>('grid');
  const [keyword, setKeyword] = useState('');
  const [folderPath, setFolderPath] = useState<FileEntryDto[]>([]);
  const [localSelectedId, setLocalSelectedId] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [nameMode, setNameMode] = useState<NameDialogMode>(null);
  const [name, setName] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const parentId = folderPath.at(-1)?.id ?? null;
  const selectedId = onFileChange ? (fileId ?? '') : localSelectedId;
  const setSelectedId = (nextId: string) => {
    setLocalSelectedId(nextId);
    onFileChange?.(nextId || undefined);
  };
  const listResult = useQuery(filesQuery(parentId, keyword));
  const storage = useQuery(storageOverviewQuery);
  const entries = listResult.data?.list ?? emptyFiles;
  const selected = entries.find((entry) => entry.id === selectedId);
  const canUpload = matchPermission({ permissions, systemAdmin }, 'file:doc:upload');
  const canDownload = matchPermission({ permissions, systemAdmin }, 'file:doc:download');
  const canRename = matchPermission({ permissions, systemAdmin }, 'file:doc:rename');
  const canDelete = matchPermission({ permissions, systemAdmin }, 'file:doc:del');
  const canShare = matchPermission({ permissions, systemAdmin }, 'file:doc:share');
  const invalidate = () => queryClient.invalidateQueries({ queryKey: fileKeys.all });
  const upload = useMutation({
    mutationFn: fileApi.upload,
    onSuccess: async () => {
      setUploadOpen(false);
      setUploadFiles([]);
      await invalidate();
      toast.success(t('files.toast.uploaded'));
    },
  });
  const createFolder = useMutation({
    mutationFn: fileApi.createFolder,
    onSuccess: async () => {
      setNameMode(null);
      await invalidate();
      toast.success(t('files.toast.folderCreated'));
    },
  });
  const rename = useMutation({
    mutationFn: ({ id, nextName }: { id: string; nextName: string }) =>
      fileApi.rename(id, { name: nextName }),
    onSuccess: async () => {
      setNameMode(null);
      await invalidate();
      toast.success(t('files.toast.renamed'));
    },
  });
  const remove = useMutation({
    mutationFn: fileApi.delete,
    onSuccess: async () => {
      setDeleteOpen(false);
      setSelectedId('');
      await invalidate();
      toast.success(t('files.toast.deleted'));
    },
  });
  const download = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('No file selected');
      await downloadFile(`/api/files/${selectedId}/download`, selected?.name ?? 'file');
    },
    onError: () => toast.error(t('files.toast.downloadFailed')),
  });
  const share = useMutation({
    mutationFn: async () => {
      if (!selectedId || !navigator.clipboard) throw new Error('Clipboard is unavailable');
      const url = new URL('/admin/files', window.location.origin);
      url.searchParams.set('fileId', selectedId);
      await navigator.clipboard.writeText(url.toString());
    },
    onSuccess: () => toast.success(t('files.toast.shared')),
    onError: () => toast.error(t('files.toast.shareFailed')),
  });
  const labels = useMemo(
    () => ({
      name: t('files.columns.name'),
      size: t('files.columns.size'),
      owner: t('files.columns.owner'),
      date: t('files.columns.date'),
      folderUnit: t('files.folderUnit'),
    }),
    [t],
  );
  const columns = useMemo(() => fileColumns(labels), [labels]);
  const open = (entry: FileEntryDto) => {
    if (entry.kind === 'folder') {
      setFolderPath((current) => [...current, entry]);
      setKeyword('');
    } else setSelectedId(entry.id);
  };
  return (
    <PageFrame breadcrumbs={[{ label: t('files.breadcrumbGroup') }, { label: t('files.title') }]}>
      <Card spacing="compact" className="mb-3">
        <CardHeader className="flex-row items-baseline gap-3">
          <CardTitle>{t('files.storage.title')}</CardTitle>
          <span className="text-sm text-text-3">
            {t('files.storage.used', { used: storage.data?.used ?? 0, total: storage.data?.total ?? 0 })}
          </span>
        </CardHeader>
        <CardContent className="block">
          <ProgressBar
            className="h-2"
            value={storage.data ? storage.data.used : 0}
            max={storage.data?.total ?? 15}
            aria-label={t('files.storage.title')}
          />
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-2">
            {storage.data?.segments.map((segment) => (
              <span key={segment.kind}>
                {t(`files.storage.${segment.kind}`)} {segment.percent}%
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
      <PageSurface>
        <DataToolbar variant="surface">
          <DataToolbarGroup>
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setFolderPath([]);
                setKeyword('');
              }}
              aria-label={t('files.root')}
            >
              {t('files.root')}
            </Button>
            {folderPath.map((folder, index) => (
              <span key={folder.id} className="flex items-center gap-1">
                <span className="text-text-3">/</span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setFolderPath((current) => current.slice(0, index + 1))}
                >
                  {folder.name}
                </Button>
              </span>
            ))}
            <span className="text-xs text-text-3">
              {t('files.total', { count: listResult.data?.total ?? 0 })}
            </span>
          </DataToolbarGroup>
          <DataToolbarGroup align="end">
            <SearchField
              aria-label={t('files.search')}
              placeholder={t('files.search')}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              containerClassName="w-[calc(220px*var(--app-scale))]"
            />
            <Button
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label={t('files.views.grid')}
              onClick={() => setView('grid')}
            >
              <Grid3X3 />
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label={t('files.views.list')}
              onClick={() => setView('list')}
            >
              <List />
            </Button>
            {canUpload && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setName(t('files.defaultFolderName'));
                    setNameMode('folder');
                  }}
                >
                  <FolderPlus data-icon="inline-start" />
                  {t('files.actions.newFolder')}
                </Button>
                <Button size="sm" onClick={() => setUploadOpen(true)}>
                  <Upload data-icon="inline-start" />
                  {t('files.actions.upload')}
                </Button>
              </>
            )}
          </DataToolbarGroup>
        </DataToolbar>
        <PagePaneBody className="min-h-[calc(420px*var(--app-scale))]">
          {view === 'grid' ? (
            <QueryState
              data={listResult.data}
              pending={listResult.isPending}
              error={listResult.isError}
              loadingLabel={t('files.loading')}
              errorLabel={tCommon('errors.refetchFailed')}
              retryLabel={tCommon('errors.retry')}
              onRetry={() => void listResult.refetch()}
            >
              {() => (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(calc(180px*var(--app-scale)),1fr))] gap-3">
                  {entries.map((entry) => (
                    <Button
                      key={entry.id}
                      variant="outline"
                      className="h-auto min-h-[calc(108px*var(--app-scale))] flex-col px-3 py-3"
                      aria-label={
                        entry.kind === 'folder'
                          ? `${t('files.actions.openFolder')} ${entry.name}`
                          : `${t('files.actions.preview')} ${entry.name}`
                      }
                      onClick={() => open(entry)}
                    >
                      {entry.kind === 'folder' ? <Folder className="size-6" /> : <FileText className="size-6" />}
                      <span className="max-w-full truncate">{entry.name}</span>
                      <span className="text-xs font-normal text-text-3">
                        {formatFileSize(entry, t('files.folderUnit'))}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </QueryState>
          ) : (
            <DataTable
              columns={columns}
              data={entries}
              rowKey={(entry) => entry.id}
              loading={listResult.isLoading}
              error={listResult.isError}
              errorText={tCommon('errors.refetchFailed')}
              retryText={tCommon('errors.retry')}
              onRetry={() => void listResult.refetch()}
              onRowClick={open}
              emptyText={t('files.empty')}
              loadingText={t('files.loading')}
            />
          )}
        </PagePaneBody>
      </PageSurface>

      <UploadFileDialog
        open={uploadOpen}
        files={uploadFiles}
        pending={upload.isPending}
        labels={{
          title: t('files.upload.title'),
          drop: t('files.upload.drop'),
          hint: t('files.upload.hint'),
          input: t('files.upload.input'),
          cancel: t('files.actions.cancel'),
          submit: t('files.upload.submit'),
          tooLarge: t('files.upload.tooLarge'),
        }}
        onOpenChange={setUploadOpen}
        onFiles={setUploadFiles}
        onSubmit={() => {
          const file = uploadFiles[0];
          if (file) upload.mutate({ name: file.name, mimeType: file.type, size: file.size, parentId });
        }}
      />
      <Dialog
        open={nameMode !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setNameMode(null);
        }}
      >
        <FormDialogContent
          title={nameMode === 'folder' ? t('files.folderDialog.title') : t('files.renameDialog.title')}
          cancelText={t('files.actions.cancel')}
          submitText={t('files.actions.save')}
          submitDisabled={!name.trim()}
          onCancel={() => setNameMode(null)}
          onSubmit={() => {
            if (nameMode === 'folder') createFolder.mutate({ name, parentId });
            else if (selectedId) rename.mutate({ id: selectedId, nextName: name });
          }}
        >
          <Input
            aria-label={t('files.name')}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormDialogContent>
      </Dialog>
      <FilePreviewSheet
        fileId={selectedId}
        permissions={{ download: canDownload, rename: canRename, delete: canDelete, share: canShare }}
        labels={{
          previewDescription: t('files.preview.description'),
          download: t('files.actions.download'),
          rename: t('files.actions.rename'),
          share: t('files.actions.share'),
          delete: t('files.actions.delete'),
          imagePreview: t('files.preview.image'),
          documentPreview: t('files.preview.document'),
          type: t('files.preview.type'),
          size: t('files.columns.size'),
          owner: t('files.columns.owner'),
          date: t('files.columns.date'),
          folderUnit: t('files.folderUnit'),
          loading: t('files.loading'),
          loadFailed: tCommon('errors.refetchFailed'),
          retry: tCommon('errors.retry'),
        }}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedId('');
        }}
        onDownload={() => download.mutate()}
        downloading={download.isPending}
        sharing={share.isPending}
        onRename={() => {
          setName(selected?.name ?? '');
          setNameMode('rename');
        }}
        onDelete={() => setDeleteOpen(true)}
        onShare={() => share.mutate()}
      />
      <ConfirmDialog
        open={deleteOpen}
        title={t('files.deleteDialog.title')}
        description={t('files.deleteDialog.description', { name: selected?.name ?? '' })}
        cancelText={t('files.actions.cancel')}
        confirmText={t('files.actions.delete')}
        pending={remove.isPending}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          if (selectedId) remove.mutate(selectedId);
        }}
      />
    </PageFrame>
  );
}
