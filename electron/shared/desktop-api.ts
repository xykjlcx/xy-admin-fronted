import { z } from 'zod';
import type { CredentialClearInput } from './schemas';

export const WindowSnapshotSchema = z.object({
  runtime: z.literal('desktop'),
  platform: z.enum(['darwin', 'win32']),
  chrome: z.enum(['native', 'integrated']),
});

export type WindowSnapshot = z.infer<typeof WindowSnapshotSchema>;

export interface DesktopApi {
  window: {
    getSnapshot(): WindowSnapshot;
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
}
