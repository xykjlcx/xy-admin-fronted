import type { TFunction } from 'i18next';
import { ChevronsDown, ChevronsUp, PanelLeft, PanelRight, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  PagePane,
  PagePaneBody,
  PagePaneHeader,
  PagePaneToolbar,
  PageThreePane,
} from '@/components/pro/PageScaffold';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { MenuInspector } from '../detail/MenuInspector';
import { MenuTree } from './MenuTree';
import type { ManagedMenuRow } from '../model';
import type { MenuCapabilities } from '../types';
import type { MenuRecord } from '@/modules/types';

interface MenuWorkspaceProps {
  navigation: ReactNode;
  activeSubsystemName: string;
  navigationCount: number;
  refreshing: boolean;
  keyword: string;
  rows: ManagedMenuRow[];
  collapsedIds: string[];
  selectedMenu: MenuRecord | null;
  selectedParent: MenuRecord | null;
  selectedHasChildren: boolean;
  selectedActions: MenuRecord[];
  allMenusCollapsed: boolean;
  canCollapse: boolean;
  inspectorOpen: boolean;
  locale: string;
  t: TFunction<'admin'>;
  capabilities: MenuCapabilities;
  onKeywordChange: (keyword: string) => void;
  onOpenNavigation: () => void;
  onInspectorOpenChange: (open: boolean) => void;
  onToggleAll: () => void;
  onToggleNode: (id: string) => void;
  onSelect: (menu: MenuRecord) => void;
  onCreateRoot: () => void;
  onCreateChild: (menu: MenuRecord) => void;
  onCreateAction: (menu: MenuRecord) => void;
  onEdit: (menu: MenuRecord) => void;
  onDelete: (menu: MenuRecord) => void;
  onSetVisibility: (id: string, visible: boolean) => void;
}

export function MenuWorkspace(props: MenuWorkspaceProps) {
  const inspector = (
    <MenuInspector
      menu={props.selectedMenu}
      parent={props.selectedParent}
      hasChildren={props.selectedHasChildren}
      actions={props.selectedActions}
      locale={props.locale}
      t={props.t}
      capabilities={props.capabilities}
      onCreateAction={props.onCreateAction}
      onEdit={props.onEdit}
      onDelete={props.onDelete}
      onSetVisibility={props.onSetVisibility}
    />
  );

  return (
    <>
      <PageThreePane role="region" aria-label={props.t('menus.workspaceLabel')}>
        {props.navigation}
        <PagePane
          variant="master"
          aria-label={props.t('menus.treeRegionLabel', { subsystem: props.activeSubsystemName })}
        >
          <PagePaneHeader
            title={props.t('menus.treeHeading')}
            ariaLabel={props.t('menus.treeToolbarLabel')}
            meta={
              <>
                {props.t('menus.treeSummary', { count: props.navigationCount })}
                {props.refreshing ? ` · ${props.t('menus.refreshing')}` : ''}
              </>
            }
            actions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={props.onOpenNavigation}
                >
                  <PanelLeft data-icon="inline-start" />
                  {props.t('menus.subsystems.title')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="xl:hidden"
                  onClick={() => props.onInspectorOpenChange(true)}
                >
                  <PanelRight data-icon="inline-start" />
                  {props.t('menus.actions.inspect')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!props.canCollapse}
                  onClick={props.onToggleAll}
                >
                  {props.allMenusCollapsed ? (
                    <ChevronsDown data-icon="inline-start" />
                  ) : (
                    <ChevronsUp data-icon="inline-start" />
                  )}
                  {props.t(props.allMenusCollapsed ? 'menus.actions.expand' : 'menus.actions.collapse')}
                </Button>
                {props.capabilities.create && (
                  <Button type="button" size="sm" onClick={props.onCreateRoot}>
                    <Plus data-icon="inline-start" />
                    {props.t('menus.actions.create')}
                  </Button>
                )}
              </>
            }
          />
          <PagePaneToolbar>
            <SearchField
              aria-label={props.t('menus.searchLabel')}
              value={props.keyword}
              placeholder={props.t('menus.searchPlaceholder')}
              onChange={(event) => props.onKeywordChange(event.currentTarget.value)}
            />
          </PagePaneToolbar>
          <PagePaneBody>
            <MenuTree
              rows={props.rows}
              collapsedIds={props.collapsedIds}
              selectedMenuId={props.selectedMenu?.id ?? null}
              locale={props.locale}
              t={props.t}
              canCreate={props.capabilities.create}
              onSelect={props.onSelect}
              onAddChild={props.onCreateChild}
              onToggleCollapse={props.onToggleNode}
            />
          </PagePaneBody>
        </PagePane>

        <PagePane
          variant="detail"
          role="complementary"
          aria-label={props.t('menus.inspector.label')}
          className="hidden xl:flex"
        >
          <PagePaneHeader title={props.t('menus.inspector.title')} />
          <PagePaneBody>{inspector}</PagePaneBody>
        </PagePane>
      </PageThreePane>

      <Sheet open={props.inspectorOpen} onOpenChange={props.onInspectorOpenChange}>
        <SheetContent side="right" className="gap-0 overflow-y-auto">
          <SheetTitle className="sr-only">{props.t('menus.inspector.title')}</SheetTitle>
          <PagePaneHeader title={props.t('menus.inspector.title')} />
          <PagePaneBody>
            <MenuInspector
              menu={props.selectedMenu}
              parent={props.selectedParent}
              hasChildren={props.selectedHasChildren}
              actions={props.selectedActions}
              locale={props.locale}
              t={props.t}
              capabilities={props.capabilities}
              onCreateAction={(menu) => {
                props.onCreateAction(menu);
                props.onInspectorOpenChange(false);
              }}
              onEdit={(menu) => {
                props.onEdit(menu);
                props.onInspectorOpenChange(false);
              }}
              onDelete={(menu) => {
                props.onDelete(menu);
                props.onInspectorOpenChange(false);
              }}
              onSetVisibility={props.onSetVisibility}
            />
          </PagePaneBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
