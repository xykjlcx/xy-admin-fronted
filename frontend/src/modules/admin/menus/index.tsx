import { MenusScene, type MenusPageProps } from './list/MenusScene';

export type { MenusViewProps } from './list/MenusView';
export { MenusView } from './list/MenusView';

export function MenusPage(props: MenusPageProps) {
  return <MenusScene {...props} />;
}
