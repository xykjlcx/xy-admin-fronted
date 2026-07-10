import { EventEmitter } from 'node:events';
import { describe, expect, test, vi } from 'vitest';
import { bindWindowState } from './window-state';
import { ipcEvents } from '../shared/ipc-channels';

describe('window state publisher', () => {
  test('publishes initial, maximize, full-screen, and display scale changes and disposes listeners', () => {
    const windowEvents = new EventEmitter();
    const webContentsEvents = new EventEmitter();
    const screenEvents = new EventEmitter();
    let maximized = false;
    let fullScreen = false;
    let scaleFactor = 1;
    const send = vi.fn();
    const window = Object.assign(windowEvents, {
      webContents: Object.assign(webContentsEvents, { send }),
      isMaximized: () => maximized,
      isFullScreen: () => fullScreen,
      getBounds: () => ({ x: 0, y: 0, width: 1440, height: 900 }),
    });
    const displaySource = Object.assign(screenEvents, {
      getDisplayMatching: () => ({ scaleFactor }),
    });

    const dispose = bindWindowState({
      window,
      displaySource,
      platform: 'darwin',
      chrome: 'integrated',
    });
    webContentsEvents.emit('did-finish-load');
    maximized = true;
    windowEvents.emit('maximize');
    fullScreen = true;
    windowEvents.emit('enter-full-screen');
    scaleFactor = 2;
    screenEvents.emit('display-metrics-changed');

    expect(send).toHaveBeenCalledTimes(4);
    expect(send).toHaveBeenNthCalledWith(
      1,
      ipcEvents.windowStateChanged,
      expect.objectContaining({ controlsInsetLeft: 80, scaleFactor: 1 }),
    );
    expect(send).toHaveBeenNthCalledWith(
      3,
      ipcEvents.windowStateChanged,
      expect.objectContaining({ controlsInsetLeft: 0, fullScreen: true }),
    );
    expect(send).toHaveBeenNthCalledWith(
      4,
      ipcEvents.windowStateChanged,
      expect.objectContaining({ scaleFactor: 2 }),
    );

    dispose();
    windowEvents.emit('unmaximize');
    screenEvents.emit('display-metrics-changed');
    expect(send).toHaveBeenCalledTimes(4);
  });
});
