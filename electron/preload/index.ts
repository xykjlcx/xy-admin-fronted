import { contextBridge } from 'electron';
import { getDesktopEnvironment } from '../config';
import { WindowSnapshotSchema, type DesktopApi } from '../shared/desktop-api';

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
});

contextBridge.exposeInMainWorld('desktop', desktopApi);
