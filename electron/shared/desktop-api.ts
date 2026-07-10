import type {
  CredentialClearInput,
  FileDownloadEvent,
  FileDownloadStartInput,
  FileDownloadStartResult,
} from './schemas';
import type { WindowSnapshot } from './window-state';

export { WindowSnapshotSchema } from './window-state';
export type { WindowSnapshot } from './window-state';

export interface DesktopApi {
  window: {
    getSnapshot(): WindowSnapshot;
    subscribe(listener: (snapshot: WindowSnapshot) => void): () => void;
  };
  clipboard: {
    writeText(text: string): Promise<void>;
  };
  external: {
    open(url: string): Promise<void>;
  };
  credentials: {
    restore(): Promise<string | null>;
    persist(token: string): Promise<void>;
    clear(reason: CredentialClearInput['reason']): Promise<void>;
  };
  files: {
    save(input: FileDownloadStartInput): Promise<FileDownloadStartResult>;
    cancel(taskId: string): Promise<void>;
    subscribe(listener: (event: FileDownloadEvent) => void): () => void;
  };
}
