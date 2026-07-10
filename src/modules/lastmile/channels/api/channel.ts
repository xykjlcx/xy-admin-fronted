import { queryOptions } from '@tanstack/react-query';
import { defineApiContract } from '@/lib/http/contract';
import { http } from '@/lib/http/client';
import { channelKeys } from './keys';
import {
  ChannelBatchSchema,
  ChannelInputSchema,
  ChannelListSchema,
  ChannelOptionsSchema,
  ChannelSchema,
  ChannelTestResultSchema,
  ChannelToggleSchema,
  type ChannelInput,
  type ChannelKindFilter,
  type ChannelStatusFilter,
} from './schema';
const listContract = defineApiContract({ response: ChannelListSchema });
const detailContract = defineApiContract({ response: ChannelSchema });
const optionsContract = defineApiContract({ response: ChannelOptionsSchema });
const testContract = defineApiContract({ response: ChannelTestResultSchema });
export const channelsQuery = (keyword: string, kind: ChannelKindFilter, status: ChannelStatusFilter) =>
  queryOptions({
    queryKey: channelKeys.list(keyword, kind, status),
    queryFn: ({ signal }) =>
      http.get('/api/lastmile/channels', { keyword, kind, status }, listContract, { signal }),
  });
export const channelDetailQuery = (id: string) =>
  queryOptions({
    queryKey: channelKeys.detail(id),
    queryFn: ({ signal }) => http.get(`/api/lastmile/channels/${id}`, undefined, detailContract, { signal }),
  });
export const channelOptionsQuery = queryOptions({
  queryKey: channelKeys.options(),
  queryFn: ({ signal }) => http.get('/api/lastmile/channel-options', undefined, optionsContract, { signal }),
  staleTime: 5 * 60_000,
});
export const channelApi = {
  create: (input: ChannelInput) =>
    http.post('/api/lastmile/channels', ChannelInputSchema.parse(input), detailContract),
  update: (id: string, input: ChannelInput) =>
    http.put(`/api/lastmile/channels/${id}`, ChannelInputSchema.parse(input), detailContract),
  toggle: (id: string, enabled: boolean) =>
    http.patch(`/api/lastmile/channels/${id}/status`, ChannelToggleSchema.parse({ enabled }), detailContract),
  batchEnable: (ids: string[]) =>
    http.post('/api/lastmile/channels/batch-enable', ChannelBatchSchema.parse({ ids }), listContract),
  test: (id: string) => http.post(`/api/lastmile/channels/${id}/test`, undefined, testContract),
};
