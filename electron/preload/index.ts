import { contextBridge, ipcRenderer } from 'electron';
import { getDesktopEnvironment } from '../config';
import { WindowSnapshotSchema, type DesktopApi } from '../shared/desktop-api';
import { ipcChannels } from '../shared/ipc-channels';
import {
  ClipboardWriteInputSchema,
  CredentialClearInputSchema,
  CredentialPersistInputSchema,
  CredentialRestoreResultSchema,
  ExternalOpenInputSchema,
  IpcSuccessSchema,
  type CredentialClearInput,
} from '../shared/schemas';

const environment = getDesktopEnvironment();
const platform = process.platform === 'darwin' ? 'darwin' : 'win32';
const snapshot = WindowSnapshotSchema.parse({
  runtime: 'desktop',
  platform,
  chrome: environment.windowChrome,
});

const desktopApi: DesktopApi = Object.freeze({
  window: Object.freeze({
    getSnapshot: () => snapshot,
  }),
  clipboard: Object.freeze({
    writeText: async (text: string) => {
      const input = ClipboardWriteInputSchema.parse({ text });
      IpcSuccessSchema.parse(await ipcRenderer.invoke(ipcChannels.clipboardWrite, input));
    },
  }),
  external: Object.freeze({
    open: async (url: string) => {
      const input = ExternalOpenInputSchema.parse({ url });
      IpcSuccessSchema.parse(await ipcRenderer.invoke(ipcChannels.externalOpen, input));
    },
  }),
  credentials: Object.freeze({
    restore: async () => {
      const result = CredentialRestoreResultSchema.parse(
        await ipcRenderer.invoke(ipcChannels.credentialRestore, undefined),
      );
      return result.token;
    },
    persist: async (token: string) => {
      const input = CredentialPersistInputSchema.parse({ token });
      IpcSuccessSchema.parse(await ipcRenderer.invoke(ipcChannels.credentialPersist, input));
    },
    clear: async (reason: CredentialClearInput['reason']) => {
      const input = CredentialClearInputSchema.parse({ reason });
      IpcSuccessSchema.parse(await ipcRenderer.invoke(ipcChannels.credentialClear, input));
    },
  }),
});

contextBridge.exposeInMainWorld('desktop', desktopApi);
