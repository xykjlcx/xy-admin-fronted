import { MessagesScene } from './list/MessagesScene';

export function MessagesPage({ permissions }: { permissions: string[] }) {
  return <MessagesScene permissions={permissions} />;
}
