import { FilesScene } from './list/FilesScene';

export function FilesPage({
  permissions,
  fileId,
  onFileChange,
}: {
  permissions: string[];
  fileId?: string;
  onFileChange?: (fileId?: string) => void;
}) {
  return <FilesScene permissions={permissions} fileId={fileId} onFileChange={onFileChange} />;
}
