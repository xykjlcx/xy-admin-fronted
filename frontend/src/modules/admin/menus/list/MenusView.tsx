import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageFrame, PageSurface } from '@/components/pro/PageScaffold';
import { lv } from '@/lib/localized';
import { matchPermission } from '@/lib/permission';
import { MenuOverlays } from './MenuOverlays';
import { MenuWorkspace } from './MenuWorkspace';
import {
  SubsystemPanel,
  SubsystemSheet,
  type SubsystemPanelProps,
} from './SubsystemPanel';
import { buildManagedMenuRows, collapsibleMenuIds, hasMenuChildren } from '../model';
import type {
  CreateMenuInput,
  CreateSubsystemInput,
  UpdateMenuInput,
  UpdateSubsystemInput,
} from '../api';
import type { MenuCapabilities, MenuOverlay } from '../types';
import type { MenuRecord, Subsystem } from '@/modules/types';

export interface MenusViewProps {
  permissions: string[];
  subsystems: Subsystem[];
  activeSubsystemKey: string;
  menus: MenuRecord[];
  refreshing?: boolean;
  onActiveSubsystemChange: (key: string) => void;
  onCreateSubsystem: (dto: CreateSubsystemInput) => void | Promise<void>;
  onCreateMenu: (dto: CreateMenuInput) => void | Promise<void>;
  onUpdateMenu: (id: string, dto: UpdateMenuInput) => void | Promise<void>;
  onUpdateSubsystem: (key: string, dto: UpdateSubsystemInput) => void | Promise<void>;
  onDeleteMenu: (id: string) => void | Promise<void>;
  onSetMenuVisibility: (id: string, visible: boolean) => void | Promise<void>;
}

export function MenusView({
  permissions,
  subsystems,
  activeSubsystemKey,
  menus,
  refreshing = false,
  onActiveSubsystemChange,
  onCreateSubsystem,
  onCreateMenu,
  onUpdateMenu,
  onUpdateSubsystem,
  onDeleteMenu,
  onSetMenuVisibility,
}: MenusViewProps) {
  const { t, i18n } = useTranslation('admin');
  const locale = i18n.language;
  const [keyword, setKeyword] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [subsystemOpen, setSubsystemOpen] = useState(false);
  const [overlay, setOverlay] = useState<MenuOverlay>({ kind: 'none' });

  const activeSubsystem =
    subsystems.find((subsystem) => subsystem.key === activeSubsystemKey) ?? subsystems[0];
  const activeKey = activeSubsystem?.key ?? activeSubsystemKey;
  const navigationMenus = useMemo(() => menus.filter((menu) => menu.type !== 'action'), [menus]);
  const rows = useMemo(
    () => buildManagedMenuRows(menus, collapsedIds, locale, keyword),
    [collapsedIds, keyword, locale, menus],
  );
  const collapsibleIds = useMemo(() => collapsibleMenuIds(navigationMenus), [navigationMenus]);
  const allMenusCollapsed =
    collapsibleIds.length > 0 && collapsibleIds.every((id) => collapsedIds.includes(id));
  const selectedMenu =
    rows.find((row) => row.menu.id === selectedMenuId)?.menu ??
    rows.find((row) => !row.hiddenByCollapse)?.menu ??
    navigationMenus[0] ??
    null;
  const selectedParent = selectedMenu?.parentId
    ? (menus.find((menu) => menu.id === selectedMenu.parentId) ?? null)
    : null;
  const selectedActions = useMemo(
    () =>
      selectedMenu?.type === 'menu'
        ? menus
            .filter((menu) => menu.type === 'action' && menu.parentId === selectedMenu.id)
            .toSorted((a, b) => a.sort - b.sort)
        : [],
    [menus, selectedMenu],
  );
  const capabilities: MenuCapabilities = {
    create: matchPermission(permissions, 'iam:menu:create'),
    update: matchPermission(permissions, 'iam:menu:update'),
    delete: matchPermission(permissions, 'iam:menu:del'),
    toggle: matchPermission(permissions, 'iam:menu:toggle'),
  };

  const selectSubsystem = (key: string) => {
    setKeyword('');
    setCollapsedIds([]);
    setSelectedMenuId(null);
    onActiveSubsystemChange(key);
  };
  const openCreateSubsystem = () =>
    setOverlay({ kind: 'subsystem-form', state: { mode: 'create' } });
  const openEditSubsystem = (subsystem: Subsystem) =>
    setOverlay({ kind: 'subsystem-form', state: { mode: 'edit', subsystem } });
  const subsystemPanelProps: SubsystemPanelProps = {
    subsystems,
    activeKey,
    locale,
    t,
    capabilities,
    onSelect: selectSubsystem,
    onCreate: openCreateSubsystem,
    onEdit: openEditSubsystem,
  };
  const toggleNode = (id: string) => {
    setCollapsedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };
  const submitMenu = async (dto: UpdateMenuInput) => {
    if (overlay.kind !== 'menu-form') return;
    if (overlay.state.mode === 'create' ? !capabilities.create : !capabilities.update) return;

    try {
      if (overlay.state.mode === 'create') {
        await onCreateMenu({ subsystemKey: activeKey, ...dto });
      } else {
        await onUpdateMenu(overlay.state.menu.id, dto);
      }
    } catch {
      return;
    }
    setOverlay({ kind: 'none' });
  };
  const submitSubsystem = async (
    payload:
      | { mode: 'create'; dto: CreateSubsystemInput }
      | { mode: 'edit'; key: string; dto: UpdateSubsystemInput },
  ) => {
    if (payload.mode === 'create' ? !capabilities.create : !capabilities.update) return;
    try {
      if (payload.mode === 'create') await onCreateSubsystem(payload.dto);
      else await onUpdateSubsystem(payload.key, payload.dto);
    } catch {
      return;
    }
    setOverlay({ kind: 'none' });
  };
  const confirmDelete = async () => {
    if (overlay.kind !== 'delete' || !capabilities.delete) return;
    try {
      await onDeleteMenu(overlay.menu.id);
    } catch {
      return;
    }
    setOverlay({ kind: 'none' });
  };
  const setVisibility = (id: string, visible: boolean) => {
    if (!capabilities.toggle) return;
    void Promise.resolve(onSetMenuVisibility(id, visible)).catch(() => undefined);
  };

  return (
    <PageFrame breadcrumbs={[{ label: t('menus.breadcrumbGroup') }, { label: t('menus.title') }]}>
      <PageSurface data-testid="menu-management-surface" className="min-h-0 flex-1">
        <MenuWorkspace
          navigation={<SubsystemPanel {...subsystemPanelProps} />}
          activeSubsystemName={activeSubsystem ? lv(activeSubsystem.label, locale) : '-'}
          navigationCount={navigationMenus.length}
          refreshing={refreshing}
          keyword={keyword}
          rows={rows}
          collapsedIds={collapsedIds}
          selectedMenu={selectedMenu}
          selectedParent={selectedParent}
          selectedHasChildren={selectedMenu ? hasMenuChildren(menus, selectedMenu.id) : false}
          selectedActions={selectedActions}
          allMenusCollapsed={allMenusCollapsed}
          canCollapse={collapsibleIds.length > 0}
          inspectorOpen={inspectorOpen}
          locale={locale}
          t={t}
          capabilities={capabilities}
          onKeywordChange={setKeyword}
          onOpenNavigation={() => setSubsystemOpen(true)}
          onInspectorOpenChange={setInspectorOpen}
          onToggleAll={() => setCollapsedIds(allMenusCollapsed ? [] : collapsibleIds)}
          onToggleNode={toggleNode}
          onSelect={(menu) => setSelectedMenuId(menu.id)}
          onCreateRoot={() =>
            setOverlay({ kind: 'menu-form', state: { mode: 'create', parentId: null, type: 'dir' } })
          }
          onCreateChild={(menu) =>
            setOverlay({ kind: 'menu-form', state: { mode: 'create', parentId: menu.id, type: 'menu' } })
          }
          onCreateAction={(menu) =>
            setOverlay({ kind: 'menu-form', state: { mode: 'create', parentId: menu.id, type: 'action' } })
          }
          onEdit={(menu) => setOverlay({ kind: 'menu-form', state: { mode: 'edit', menu } })}
          onDelete={(menu) => setOverlay({ kind: 'delete', menu })}
          onSetVisibility={setVisibility}
        />
      </PageSurface>

      <SubsystemSheet
        {...subsystemPanelProps}
        open={subsystemOpen}
        onOpenChange={setSubsystemOpen}
      />

      <MenuOverlays
        overlay={overlay}
        activeSubsystemKey={activeKey}
        menus={menus}
        subsystems={subsystems}
        locale={locale}
        t={t}
        onClose={() => setOverlay({ kind: 'none' })}
        onSubmitMenu={submitMenu}
        onSubmitSubsystem={submitSubsystem}
        onConfirmDelete={confirmDelete}
      />
    </PageFrame>
  );
}
