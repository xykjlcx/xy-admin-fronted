import type { FileEntryDto } from './api';

export function formatFileSize(entry: FileEntryDto, folderUnit: string) {
  if (entry.kind === 'folder') return `${entry.childCount} ${folderUnit}`;
  if (entry.size === null) return '—';
  if (entry.size < 1024 * 1024) return `${Math.max(1, Math.round(entry.size / 1024))} KB`;
  return `${(entry.size / (1024 * 1024)).toFixed(1)} MB`;
}
