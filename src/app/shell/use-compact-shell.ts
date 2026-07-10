import { useSyncExternalStore } from 'react';

const compactShellQuery = '(max-width: 1023px)';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const media = window.matchMedia(compactShellQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function snapshot() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.(compactShellQuery).matches);
}

export function useCompactShell() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
