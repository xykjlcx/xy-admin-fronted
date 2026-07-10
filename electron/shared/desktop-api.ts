import { z } from 'zod';

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
}
