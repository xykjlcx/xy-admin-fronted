import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const stableSemVer = z
  .string()
  .regex(/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:\+[0-9A-Za-z.-]+)?$/);
const PendingUpdateMarkerSchema = z
  .object({
    fromVersion: stableSemVer,
    toVersion: stableSemVer,
    createdAt: z.string().datetime(),
  })
  .strict();

export function createPendingUpdateMarker(filePath: string, now = () => new Date().toISOString()) {
  return {
    async write(input: { fromVersion: string; toVersion: string }): Promise<void> {
      const payload = PendingUpdateMarkerSchema.parse({ ...input, createdAt: now() });
      await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
      const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
      let file: Awaited<ReturnType<typeof open>> | null = null;
      try {
        file = await open(temporaryPath, 'wx', 0o600);
        await file.writeFile(`${JSON.stringify(payload)}\n`, 'utf8');
        await file.sync();
        await file.close();
        file = null;
        await rename(temporaryPath, filePath);
      } finally {
        await file?.close().catch(() => undefined);
        await rm(temporaryPath, { force: true }).catch(() => undefined);
      }
    },
    async read(): Promise<z.infer<typeof PendingUpdateMarkerSchema> | null> {
      let raw: string;
      try {
        raw = await readFile(filePath, 'utf8');
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
        throw error;
      }
      try {
        return PendingUpdateMarkerSchema.parse(JSON.parse(raw));
      } catch {
        throw new Error('更新 marker 损坏');
      }
    },
    clear: () => rm(filePath, { force: true }),
  };
}
