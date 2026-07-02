import { http } from '@/lib/http/client';
import { queryOptions } from '@tanstack/react-query';
import type { MenuRecord, Subsystem } from '@/modules/types';

export const subsystemsQuery = queryOptions({
  queryKey: ['nav', 'subsystems'],
  staleTime: Infinity,
  queryFn: () => http.get<Subsystem[]>('/api/subsystems'),
});

export const menusQuery = (subsystem: string) =>
  queryOptions({
    queryKey: ['nav', 'menus', subsystem],
    staleTime: Infinity,
    queryFn: () => http.get<MenuRecord[]>('/api/menus', { subsystem }),
  });
