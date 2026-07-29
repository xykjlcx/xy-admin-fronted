import type { TFunction } from 'i18next';
import { Edit3, Trash2 } from 'lucide-react';
import { DescriptionList } from '@/components/pro/DescriptionList';
import { PageSection } from '@/components/pro/PageScaffold';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Icon } from '@/lib/icon-registry';
import { lv } from '@/lib/localized';
import { MenuActionList } from './MenuActionList';
import type { MenuCapabilities } from '../types';
import type { MenuRecord } from '@/modules/types';

const typeBadge: Record<MenuRecord['type'], 'primary' | 'success' | 'warning'> = {
  dir: 'primary',
  menu: 'success',
  action: 'warning',
};

interface MenuInspectorProps {
  menu: MenuRecord | null;
  parent: MenuRecord | null;
  hasChildren: boolean;
  actions: MenuRecord[];
  locale: string;
  t: TFunction<'admin'>;
  capabilities: MenuCapabilities;
  onCreateAction: (menu: MenuRecord) => void;
  onEdit: (menu: MenuRecord) => void;
  onDelete: (menu: MenuRecord) => void;
  onSetVisibility: (id: string, visible: boolean) => void;
}

export function MenuInspector(props: MenuInspectorProps) {
  const { menu, parent, hasChildren, actions, locale, t, capabilities } = props;
  if (!menu)
    return <PageSection title={t('menus.inspector.title')}>{t('menus.inspector.empty')}</PageSection>;

  const name = lv(menu.label, locale);
  const emptyValue = t('menus.inspector.emptyValue');
  const visibleValue = (
    <div className="flex items-center gap-3">
      <span>{menu.visible ? t('menus.inspector.visible') : t('menus.inspector.hidden')}</span>
      {capabilities.toggle && (
        <Switch
          aria-label={t('menus.actions.toggleVisible', { name })}
          checked={menu.visible}
          size="sm"
          onCheckedChange={(visible) => props.onSetVisibility(menu.id, visible)}
        />
      )}
    </div>
  );

  return (
    <div className="grid gap-3">
      <PageSection
        data-testid="menu-detail-header"
        variant="card"
        leading={<Icon name={menu.icon} />}
        title={name}
        description={menu.id}
        actions={
          <>
            <Badge variant={typeBadge[menu.type]}>{t(`menus.types.${menu.type}`)}</Badge>
            {capabilities.update && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={t('menus.actions.editName', { name })}
                onClick={() => props.onEdit(menu)}
              >
                <Edit3 data-icon="inline-start" />
                {t('menus.actions.edit')}
              </Button>
            )}
            {capabilities.delete && !hasChildren && (
              <Button
                type="button"
                size="sm"
                variant="danger-ghost"
                aria-label={t('menus.actions.deleteName', { name })}
                onClick={() => props.onDelete(menu)}
              >
                <Trash2 data-icon="inline-start" />
                {t('menus.actions.delete')}
              </Button>
            )}
          </>
        }
      />

      <PageSection
        aria-label={t('menus.inspector.basicInfo')}
        data-testid="menu-basic-card"
        variant="card"
        title={t('menus.inspector.basicInfo')}
      >
        <DescriptionList
          columns={2}
          density="compact"
          items={[
            { label: t('menus.columns.path'), value: menu.path || emptyValue },
            { label: t('menus.columns.permission'), value: menu.permission || emptyValue },
            {
              label: t('menus.form.parent'),
              value: parent ? lv(parent.label, locale) : t('menus.form.rootParent'),
            },
            { label: t('menus.form.sort'), value: String(menu.sort) },
            { label: t('menus.columns.visible'), value: visibleValue },
          ]}
        />
      </PageSection>

      <MenuActionList
        menu={menu}
        actions={actions}
        locale={locale}
        t={t}
        capabilities={capabilities}
        onCreate={props.onCreateAction}
        onEdit={props.onEdit}
        onDelete={props.onDelete}
        onSetVisibility={props.onSetVisibility}
      />
    </div>
  );
}
