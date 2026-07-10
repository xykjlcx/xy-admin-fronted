import { createBrowserHistory, createHashHistory, type RouterHistory } from '@tanstack/react-router';
import type { HostRuntime } from '@/config/env';

interface InternalLocation {
  pathname: string;
  searchStr: string;
}

export function createHostHistory(runtime: HostRuntime): RouterHistory {
  return runtime === 'desktop' ? createHashHistory() : createBrowserHistory();
}

export function buildInternalRedirect(location: InternalLocation): string {
  return `${location.pathname}${location.searchStr}`;
}
