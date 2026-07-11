import { DictionariesScene } from './list/DictionariesScene';

export function DictionariesPage({ permissions }: { permissions: string[] }) {
  return <DictionariesScene permissions={permissions} />;
}
