import { MessagesScene } from './list/MessagesScene';

export function MessagesPage({ permissions, systemAdmin }: { permissions: string[]; systemAdmin?: boolean }) {
  return <MessagesScene permissions={permissions} systemAdmin={systemAdmin} />;
}
