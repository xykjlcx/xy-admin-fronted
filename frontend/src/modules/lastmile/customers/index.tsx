import { CustomerDetailScene } from './detail/CustomerDetailScene';
import { CustomersScene } from './list/CustomersScene';
export function CustomersPage(props: {
  permissions: string[];
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onDetail: (id: string) => void;
}) {
  return <CustomersScene {...props} />;
}
export function CustomerDetailPage(props: { id: string; permissions: string[]; onBack: () => void }) {
  return <CustomerDetailScene {...props} />;
}
