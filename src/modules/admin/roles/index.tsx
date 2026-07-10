import { RolesScene, type RolesPageProps } from './list/RolesScene';

export type { RolesViewProps } from './types';
export { RolesView } from './list/RolesScene';

export function RolesPage(props: RolesPageProps) {
  return <RolesScene {...props} />;
}
