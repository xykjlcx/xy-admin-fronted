import type { ShipmentListSearch } from './types';
import { ShipmentDetailScene } from './detail/ShipmentDetailScene';
import { ShipmentPrintScene } from './detail/ShipmentPrintScene';
import { ShipmentTrackScene } from './detail/ShipmentTrackScene';
import { ShipmentFormScene } from './form/ShipmentFormScene';
import { ShipmentsScene } from './list/ShipmentsScene';

export function ShipmentsPage(props: {
  permissions: string[];
  search: ShipmentListSearch;
  onSearchChange: (search: ShipmentListSearch) => void;
  onNavigate: (target: 'new' | 'detail' | 'print' | 'track', id?: string) => void;
}) {
  return <ShipmentsScene {...props} />;
}
export function ShipmentDetailPage(props: {
  id: string;
  onBack: () => void;
  onPrint: () => void;
  onTrack: () => void;
}) {
  return <ShipmentDetailScene {...props} />;
}
export function ShipmentNewPage(props: {
  onBack: () => void;
  onCreated: (id: string, print: boolean) => void;
}) {
  return <ShipmentFormScene {...props} />;
}
export function ShipmentPrintPage(props: { id: string; onBack: () => void }) {
  return <ShipmentPrintScene {...props} />;
}
export function ShipmentTrackPage(props: { id: string; onBack: () => void }) {
  return <ShipmentTrackScene {...props} />;
}
