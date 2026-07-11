import { CarrierDetailScene } from './detail/CarrierDetailScene';
import { CarriersScene } from './list/CarriersScene';
export function CarriersPage(props: {
  permissions: string[];
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onDetail: (id: string) => void;
}) {
  return <CarriersScene {...props} />;
}
export function CarrierDetailPage(props: { id: string; onBack: () => void }) {
  return <CarrierDetailScene {...props} />;
}
