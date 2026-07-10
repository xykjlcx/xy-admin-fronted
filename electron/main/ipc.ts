import { ipcMain } from 'electron';
import { ipcChannels, type DesktopIpcChannel } from '../shared/ipc-channels';
import {
  ClipboardWriteInputSchema,
  ExternalOpenInputSchema,
  IpcSuccessSchema,
  type IpcSuccess,
} from '../shared/schemas';
import { assertTrustedSender } from './navigation-policy';

interface IpcSenderEvent {
  senderFrame: { url: string } | null;
}

interface DesktopIpcDependencies {
  writeClipboardText(text: string): void | Promise<void>;
  openExternal(url: string): void | Promise<void>;
  allowedExternalHosts: ReadonlySet<string>;
}

type DesktopIpcHandler = (event: IpcSenderEvent, input: unknown) => Promise<IpcSuccess>;

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
