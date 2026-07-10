import { ipcMain } from 'electron';
import { ipcChannels, type DesktopIpcChannel } from '../shared/ipc-channels';
import {
  ClipboardWriteInputSchema,
  CredentialClearInputSchema,
  CredentialPersistInputSchema,
  CredentialRestoreInputSchema,
  CredentialRestoreResultSchema,
  ExternalOpenInputSchema,
  FileDownloadCancelInputSchema,
  FileDownloadStartInputSchema,
  FileDownloadStartResultSchema,
  IpcSuccessSchema,
  UpdateCommandInputSchema,
  UpdateCommandResultSchema,
  UpdateGetSnapshotInputSchema,
  UpdateSnapshotSchema,
  type CredentialRestoreResult,
  type FileDownloadStartResult,
  type IpcSuccess,
  type UpdateCommand,
  type UpdateCommandResult,
  type UpdateSnapshot,
} from '../shared/schemas';
import { assertTrustedSender } from './navigation-policy';

interface IpcSenderEvent {
  senderFrame: { url: string } | null;
}

interface DesktopIpcDependencies {
  writeClipboardText(text: string): void | Promise<void>;
  openExternal(url: string): void | Promise<void>;
  allowedExternalHosts: ReadonlySet<string>;
  credentials: {
    restore(): Promise<string | null>;
    persist(token: string): Promise<void>;
    clear(): Promise<void>;
  };
  files: {
    start(input: { resourceId: string; suggestedName: string }): FileDownloadStartResult;
    cancel(taskId: string): boolean;
  };
  updater: {
    getSnapshot(): UpdateSnapshot;
    execute(command: UpdateCommand): Promise<UpdateSnapshot>;
  };
}

type DesktopIpcHandler = (
  event: IpcSenderEvent,
  input: unknown,
) => Promise<
  IpcSuccess | CredentialRestoreResult | FileDownloadStartResult | UpdateSnapshot | UpdateCommandResult
>;

function validateSender(event: IpcSenderEvent): void {
  assertTrustedSender(event.senderFrame?.url ?? '');
}

export function createDesktopIpcHandlers(
  dependencies: DesktopIpcDependencies,
): Record<DesktopIpcChannel, DesktopIpcHandler> {
  return {
    [ipcChannels.clipboardWrite]: async (event, input) => {
      validateSender(event);
      const { text } = ClipboardWriteInputSchema.parse(input);
      await dependencies.writeClipboardText(text);
      return IpcSuccessSchema.parse({ ok: true });
    },
    [ipcChannels.externalOpen]: async (event, input) => {
      validateSender(event);
      const { url } = ExternalOpenInputSchema.parse(input);
      if (!dependencies.allowedExternalHosts.has(new URL(url).hostname)) throw new Error('外链 host 未授权');
      await dependencies.openExternal(url);
      return IpcSuccessSchema.parse({ ok: true });
    },
    [ipcChannels.credentialRestore]: async (event, input) => {
      validateSender(event);
      CredentialRestoreInputSchema.parse(input);
      return CredentialRestoreResultSchema.parse({ token: await dependencies.credentials.restore() });
    },
    [ipcChannels.credentialPersist]: async (event, input) => {
      validateSender(event);
      const { token } = CredentialPersistInputSchema.parse(input);
      await dependencies.credentials.persist(token);
      return IpcSuccessSchema.parse({ ok: true });
    },
    [ipcChannels.credentialClear]: async (event, input) => {
      validateSender(event);
      CredentialClearInputSchema.parse(input);
      await dependencies.credentials.clear();
      return IpcSuccessSchema.parse({ ok: true });
    },
    [ipcChannels.fileDownloadStart]: async (event, input) => {
      validateSender(event);
      const descriptor = FileDownloadStartInputSchema.parse(input);
      return FileDownloadStartResultSchema.parse(dependencies.files.start(descriptor));
    },
    [ipcChannels.fileDownloadCancel]: async (event, input) => {
      validateSender(event);
      const { taskId } = FileDownloadCancelInputSchema.parse(input);
      dependencies.files.cancel(taskId);
      return IpcSuccessSchema.parse({ ok: true });
    },
    [ipcChannels.updaterGetSnapshot]: async (event, input) => {
      validateSender(event);
      UpdateGetSnapshotInputSchema.parse(input);
      return UpdateSnapshotSchema.parse(dependencies.updater.getSnapshot());
    },
    [ipcChannels.updaterCommand]: async (event, input) => {
      validateSender(event);
      const { command } = UpdateCommandInputSchema.parse(input);
      try {
        return UpdateCommandResultSchema.parse({
          ok: true,
          snapshot: await dependencies.updater.execute(command),
        });
      } catch (error) {
        const domainResult = UpdateCommandResultSchema.safeParse({ ok: false, error });
        if (domainResult.success) return domainResult.data;
        throw error;
      }
    },
  };
}

export function registerDesktopIpcHandlers(dependencies: DesktopIpcDependencies): () => void {
  const handlers = createDesktopIpcHandlers(dependencies);
  const channels = Object.values(ipcChannels);
  for (const channel of channels) {
    ipcMain.handle(channel, (event, input) => handlers[channel](event, input));
  }
  return () => {
    for (const channel of channels) ipcMain.removeHandler(channel);
  };
}
