import { z } from 'zod';

export const WindowSnapshotSchema = z
  .object({
    runtime: z.literal('desktop'),
    platform: z.enum(['darwin', 'win32']),
    chrome: z.enum(['native', 'integrated']),
    controlsInsetLeft: z.number().nonnegative().finite(),
    controlsInsetRight: z.number().nonnegative().finite(),
    titlebarHeight: z.number().nonnegative().finite(),
    maximized: z.boolean(),
    fullScreen: z.boolean(),
    scaleFactor: z.number().positive().finite(),
  })
  .strict();

export type WindowSnapshot = z.infer<typeof WindowSnapshotSchema>;

interface WindowSnapshotInput {
  platform: WindowSnapshot['platform'];
  chrome: WindowSnapshot['chrome'];
  maximized: boolean;
  fullScreen: boolean;
  scaleFactor: number;
}

export function createWindowSnapshot(input: WindowSnapshotInput): WindowSnapshot {
  const integrated = input.chrome === 'integrated' && !input.fullScreen;
  return WindowSnapshotSchema.parse({
    runtime: 'desktop',
    platform: input.platform,
    chrome: input.chrome,
    controlsInsetLeft: integrated && input.platform === 'darwin' ? 80 : 0,
    controlsInsetRight: integrated && input.platform === 'win32' ? 138 : 0,
    titlebarHeight: integrated ? 56 : 0,
    maximized: input.maximized,
    fullScreen: input.fullScreen,
    scaleFactor: input.scaleFactor,
  });
}
