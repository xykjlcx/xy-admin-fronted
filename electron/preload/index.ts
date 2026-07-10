import { contextBridge, ipcRenderer } from 'electron';
import { getDesktopEnvironment } from '../config';
import type { DesktopApi } from '../shared/desktop-api';
import { ipcChannels, ipcEvents } from '../shared/ipc-channels';
import {
  ClipboardWriteInputSchema,
  CredentialClearInputSchema,
  CredentialPersistInputSchema,
  CredentialRestoreResultSchema,
  ExternalOpenInputSchema,
  IpcSuccessSchema,
  type CredentialClearInput,
} from '../shared/schemas';
import { createWindowSnapshot, WindowSnapshotSchema, type WindowSnapshot } from '../shared/window-state';

const environment = getDesktopEnvironment();
const platform = process.platform === 'darwin' ? 'darwin' : 'win32';
let snapshot = createWindowSnapshot({
  platform,
  chrome: environment.windowChrome,
  maximized: false,
  fullScreen: false,
  scaleFactor: 1,
});
const windowStateListeners = new Set<(next: WindowSnapshot) => void>();
ipcRenderer.on(ipcEvents.windowStateChanged, (_event, payload: unknown) => {
  snapshot = WindowSnapshotSchema.parse(payload);
  for (const listener of windowStateListeners) listener(snapshot);
});

const desktopApi: DesktopApi = Object.freeze({
  window: Object.freeze({
    getSnapshot: () => snapshot,
    subscribe: (listener: (next: WindowSnapshot) => void) => {
      windowStateListeners.add(listener);
      return () => windowStateListeners.delete(listener);
    },
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
