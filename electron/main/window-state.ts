import type { Rectangle } from 'electron';
import type { WindowChromeMode } from '../config';
import { ipcEvents } from '../shared/ipc-channels';
import { createWindowSnapshot } from '../shared/window-state';

type WindowStateEvent = 'maximize' | 'unmaximize' | 'enter-full-screen' | 'leave-full-screen';
type WindowResizeEvent = 'resize';

interface WindowStateTarget {
  on(event: WindowStateEvent, listener: () => void): unknown;
  on(event: WindowResizeEvent, listener: () => void): unknown;
  off(event: WindowStateEvent, listener: () => void): unknown;
  off(event: WindowResizeEvent, listener: () => void): unknown;
  isMaximized(): boolean;
  isFullScreen(): boolean;
  isSimpleFullScreen(): boolean;
  getBounds(): Rectangle;
  webContents: {
    on(event: 'did-finish-load', listener: () => void): unknown;
    off(event: 'did-finish-load', listener: () => void): unknown;
    send(channel: string, payload: unknown): void;
  };
}

interface DisplaySource {
  getDisplayMatching(bounds: Rectangle): { scaleFactor: number };
  on(event: 'display-metrics-changed', listener: () => void): unknown;
  off(event: 'display-metrics-changed', listener: () => void): unknown;
}

interface BindWindowStateInput {
  window: WindowStateTarget;
  displaySource: DisplaySource;
  platform: 'darwin' | 'win32';
  chrome: WindowChromeMode;
}

const stateEvents: WindowStateEvent[] = ['maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'];

export function bindWindowState(input: BindWindowStateInput): () => void {
  const readFullScreen = () =>
    input.window.isFullScreen() || (input.platform === 'darwin' && input.window.isSimpleFullScreen());
  let lastPublishedFullScreen = readFullScreen();
  const publish = () => {
    const display = input.displaySource.getDisplayMatching(input.window.getBounds());
    const fullScreen = readFullScreen();
    lastPublishedFullScreen = fullScreen;
    input.window.webContents.send(
      ipcEvents.windowStateChanged,
      createWindowSnapshot({
        platform: input.platform,
        chrome: input.chrome,
        maximized: input.window.isMaximized(),
        fullScreen,
        scaleFactor: display.scaleFactor,
      }),
    );
  };
  const publishFullScreenResize = () => {
    if (readFullScreen() !== lastPublishedFullScreen) publish();
  };

  input.window.webContents.on('did-finish-load', publish);
  for (const event of stateEvents) input.window.on(event, publish);
  input.window.on('resize', publishFullScreenResize);
  input.displaySource.on('display-metrics-changed', publish);

  return () => {
    input.window.webContents.off('did-finish-load', publish);
    for (const event of stateEvents) input.window.off(event, publish);
    input.window.off('resize', publishFullScreenResize);
    input.displaySource.off('display-metrics-changed', publish);
  };
}
