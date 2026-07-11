import { SupplierDetailScene } from './detail/SupplierDetailScene';
import { SuppliersScene } from './list/SuppliersScene';
export function SuppliersPage(props: {
  permissions: string[];
  systemAdmin?: boolean;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onDetail: (id: string) => void;
}) {
  return <SuppliersScene {...props} />;
}
export function SupplierDetailPage(props: { id: string; onBack: () => void }) {
  return <SupplierDetailScene {...props} />;
}
