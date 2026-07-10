import type { ColumnDef } from '@tanstack/react-table';
import { FileText, Folder } from 'lucide-react';
import type { FileEntryDto } from '../api';
import { formatFileSize } from '../model';

export function fileColumns(labels: {
  name: string;
  size: string;
  owner: string;
  date: string;
  folderUnit: string;
}): ColumnDef<FileEntryDto>[] {
  return [
    {
      accessorKey: 'name',
      header: labels.name,
      size: 320,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {row.original.kind === 'folder' ? (
            <Folder data-icon="inline-start" />
          ) : (
            <FileText data-icon="inline-start" />
          )}
          <span>{row.original.name}</span>
        </div>
      ),
    },
    {
      id: 'size',
      header: labels.size,
      size: 130,
      cell: ({ row }) => formatFileSize(row.original, labels.folderUnit),
    },
    { accessorKey: 'owner', header: labels.owner, size: 140 },
    { accessorKey: 'updatedAt', header: labels.date, size: 150 },
  ];
}
