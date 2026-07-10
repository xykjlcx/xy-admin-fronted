import { queryOptions } from '@tanstack/react-query';
import { defineApiContract } from '@/lib/http/contract';
import { http } from '@/lib/http/client';
import { fileKeys } from './keys';
import {
  CreateFileSchema,
  CreateFolderSchema,
  FileEntrySchema,
  FileListResultSchema,
  NullSchema,
  RenameFileSchema,
  StorageOverviewSchema,
  type CreateFileInput,
  type CreateFolderInput,
  type RenameFileInput,
} from './schema';

const listContract = defineApiContract({ response: FileListResultSchema });
const entryContract = defineApiContract({ response: FileEntrySchema });
const storageContract = defineApiContract({ response: StorageOverviewSchema });
const nullContract = defineApiContract({ response: NullSchema });

export const filesQuery = (parentId: string | null, keyword: string) =>
  queryOptions({
    queryKey: fileKeys.list(parentId, keyword),
    queryFn: ({ signal }) =>
      http.get('/api/files', { parentId: parentId ?? 'root', keyword }, listContract, { signal }),
  });
export const fileDetailQuery = (id: string) =>
  queryOptions({
    queryKey: fileKeys.detail(id),
    queryFn: ({ signal }) => http.get(`/api/files/${id}`, undefined, entryContract, { signal }),
    enabled: id.length > 0,
  });
export const storageOverviewQuery = queryOptions({
  queryKey: fileKeys.storage(),
  staleTime: 5 * 60 * 1000,
  queryFn: ({ signal }) => http.get('/api/files/storage', undefined, storageContract, { signal }),
});

export const fileApi = {
  upload: (input: CreateFileInput) => http.post('/api/files', CreateFileSchema.parse(input), entryContract),
  createFolder: (input: CreateFolderInput) =>
    http.post('/api/files/folders', CreateFolderSchema.parse(input), entryContract),
  rename: (id: string, input: RenameFileInput) =>
    http.patch(`/api/files/${id}`, RenameFileSchema.parse(input), entryContract),
  delete: (id: string) => http.del(`/api/files/${id}`, nullContract),
};
