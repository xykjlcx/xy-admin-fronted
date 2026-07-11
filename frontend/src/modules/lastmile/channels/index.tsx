import type { ChannelKindFilter, ChannelStatusFilter } from './api';
import { ChannelDetailScene } from './detail/ChannelDetailScene';
import { ChannelFormScene } from './form/ChannelFormScene';
import { ChannelsScene } from './list/ChannelsScene';
export function ChannelsPage(props: {
  permissions: string[];
  systemAdmin?: boolean;
  keyword: string;
  kind: ChannelKindFilter;
  status: ChannelStatusFilter;
  onFiltersChange: (next: { keyword: string; kind: ChannelKindFilter; status: ChannelStatusFilter }) => void;
  onNavigate: (target: 'new' | 'detail' | 'edit', id?: string) => void;
}) {
  return <ChannelsScene {...props} />;
}
export function ChannelDetailPage(props: {
  id: string;
  permissions: string[];
  systemAdmin?: boolean;
  onBack: () => void;
  onEdit: () => void;
}) {
  return <ChannelDetailScene {...props} />;
}
export function ChannelFormPage(props: { id?: string; onBack: () => void; onSaved: (id: string) => void }) {
  return <ChannelFormScene {...props} />;
}
