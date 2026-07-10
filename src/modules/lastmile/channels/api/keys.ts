import type { ChannelKindFilter, ChannelStatusFilter } from './schema';
export const channelKeys = {
  all: ['lastmile', 'channels'] as const,
  lists: () => [...channelKeys.all, 'list'] as const,
  list: (keyword: string, kind: ChannelKindFilter, status: ChannelStatusFilter) =>
    [...channelKeys.lists(), { keyword, kind, status }] as const,
  details: () => [...channelKeys.all, 'detail'] as const,
  detail: (id: string) => [...channelKeys.details(), id] as const,
  options: () => [...channelKeys.all, 'options'] as const,
};
