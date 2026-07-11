import { DictionariesScene } from './list/DictionariesScene';

export function DictionariesPage({ permissions, systemAdmin }: { permissions: string[]; systemAdmin?: boolean }) {
  return <DictionariesScene permissions={permissions} systemAdmin={systemAdmin} />;
}
