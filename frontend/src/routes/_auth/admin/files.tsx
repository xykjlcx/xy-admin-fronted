import { createFileRoute } from '@tanstack/react-router';
import { FilesPage } from '@/modules/admin/files';

export const Route = createFileRoute('/_auth/admin/files')({
  validateSearch: (search: Record<string, unknown>) => ({
    fileId: typeof search.fileId === 'string' && search.fileId.length > 0 ? search.fileId : undefined,
  }),
  staticData: {
    labelKey: 'files.title',
    permission: 'file:doc:view',
    groupKey: 'files.breadcrumbGroup',
    actions: [
      { code: 'file:doc:upload', labelKey: 'files.actions.upload' },
      { code: 'file:doc:download', labelKey: 'files.actions.download' },
      { code: 'file:doc:rename', labelKey: 'files.actions.rename' },
      { code: 'file:doc:share', labelKey: 'files.actions.share' },
      { code: 'file:doc:del', labelKey: 'files.actions.delete' },
    ],
  },
  component: FilesRoute,
});

function FilesRoute() {
  const { me } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <FilesPage
      permissions={me.permissions}
      fileId={search.fileId}
      onFileChange={(fileId) => void navigate({ search: { fileId }, replace: true })}
    />
  );
}
