import { LogsScene } from './list/LogsScene';

export function LogsPage({ permissions, systemAdmin }: { permissions: string[]; systemAdmin?: boolean }) {
  return <LogsScene permissions={permissions} systemAdmin={systemAdmin} />;
}
