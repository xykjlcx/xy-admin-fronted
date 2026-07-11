import { FilesScene } from './list/FilesScene';

export function FilesPage({
  permissions,
  systemAdmin,
  fileId,
  onFileChange,
}: {
  permissions: string[];
  systemAdmin?: boolean;
  fileId?: string;
  onFileChange?: (fileId?: string) => void;
}) {
  return <FilesScene permissions={permissions} systemAdmin={systemAdmin} fileId={fileId} onFileChange={onFileChange} />;
}
