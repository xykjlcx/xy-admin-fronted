import type { BillFilter } from './api';
import { BillingScene } from './list/BillingScene';
export function BillingPage(props: {
  permissions: string[];
  systemAdmin?: boolean;
  keyword: string;
  status: BillFilter;
  onFiltersChange: (next: { keyword: string; status: BillFilter }) => void;
}) {
  return <BillingScene {...props} />;
}
