import { LogsScene } from './list/LogsScene';

export function LogsPage({ permissions }: { permissions: string[] }) {
  return <LogsScene permissions={permissions} />;
}
