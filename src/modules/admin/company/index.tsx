import { CompanyScene } from './detail/CompanyScene';

export function CompanyPage({ permissions }: { permissions: string[] }) {
  return <CompanyScene permissions={permissions} />;
}
