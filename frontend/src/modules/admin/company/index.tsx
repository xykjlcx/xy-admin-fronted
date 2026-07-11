import { CompanyScene } from './detail/CompanyScene';

export function CompanyPage({ permissions, systemAdmin }: { permissions: string[]; systemAdmin?: boolean }) {
  return <CompanyScene permissions={permissions} systemAdmin={systemAdmin} />;
}
