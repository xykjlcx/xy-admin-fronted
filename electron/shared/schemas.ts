import { z } from 'zod';

export const ClipboardWriteInputSchema = z.object({ text: z.string().max(1_000_000) }).strict();

export const ExternalOpenInputSchema = z
  .object({ url: z.url() })
  .strict()
  .superRefine(({ url }, context) => {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      (parsed.port && parsed.port !== '443')
    ) {
      context.addIssue({ code: 'custom', message: '外链必须是无凭据、默认端口的 HTTPS URL', path: ['url'] });
    }
  });

export const IpcSuccessSchema = z.object({ ok: z.literal(true) }).strict();

export type ClipboardWriteInput = z.infer<typeof ClipboardWriteInputSchema>;
export type ExternalOpenInput = z.infer<typeof ExternalOpenInputSchema>;
export type IpcSuccess = z.infer<typeof IpcSuccessSchema>;
