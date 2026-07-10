import { platform } from '@/lib/platform';
import type { PlatformWindowSnapshot } from '@/lib/platform/types';

interface HostWindowPlatform {
  getSnapshot(): PlatformWindowSnapshot;
  subscribe(listener: (snapshot: PlatformWindowSnapshot) => void): () => void;
}

function applyHostWindowSnapshot(root: HTMLElement, snapshot: PlatformWindowSnapshot): void {
  root.dataset.runtime = snapshot.runtime;
  root.dataset.windowChrome = snapshot.chrome;
  root.dataset.platform = snapshot.platform;
  root.dataset.maximized = String(snapshot.maximized);
  root.dataset.fullScreen = String(snapshot.fullScreen);
  root.dataset.displayScale = String(snapshot.scaleFactor);
  root.style.setProperty('--window-controls-inset-left', `${String(snapshot.controlsInsetLeft)}px`);
  root.style.setProperty('--window-controls-inset-right', `${String(snapshot.controlsInsetRight)}px`);
  root.style.setProperty('--desktop-titlebar-height', `${String(snapshot.titlebarHeight)}px`);
}

export function bindHostWindow(
  source: HostWindowPlatform,
  root: HTMLElement = document.documentElement,
): () => void {
  applyHostWindowSnapshot(root, source.getSnapshot());
  return source.subscribe((snapshot) => applyHostWindowSnapshot(root, snapshot));
}

export const disposeHostWindow = bindHostWindow(platform.window);
