import type { TFunction } from 'i18next';
import { Plus } from 'lucide-react';
import { DescriptionList } from '@/components/pro/DescriptionList';
import { PageSection } from '@/components/pro/PageScaffold';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { lv } from '@/lib/localized';
import type { MenuCapabilities } from '../types';
import type { MenuRecord } from '@/modules/types';

interface MenuActionListProps {
  menu: MenuRecord;
  actions: MenuRecord[];
  locale: string;
  t: TFunction<'admin'>;
  capabilities: MenuCapabilities;
  onCreate: (menu: MenuRecord) => void;
  onEdit: (menu: MenuRecord) => void;
  onDelete: (menu: MenuRecord) => void;
  onSetVisibility: (id: string, visible: boolean) => void;
}

export function MenuActionList({
  menu,
  actions,
  locale,
  t,
  capabilities,
  onCreate,
  onEdit,
  onDelete,
  onSetVisibility,
}: MenuActionListProps) {
  if (menu.type !== 'menu') return null;

  const items = actions.map((action) => {
    const name = lv(action.label, locale);
    return {
      label: name,
      value: action.permission || t('menus.inspector.emptyValue'),
      description: (
        <div className="flex items-center gap-2">
          {capabilities.toggle && (
            <Switch
              aria-label={t('menus.actions.toggleVisible', { name })}
              checked={action.visible}
              size="sm"
              onCheckedChange={(visible) => onSetVisibility(action.id, visible)}
            />
          )}
          {capabilities.update && (
            <Button
              type="button"
              variant="text"
              size="xs"
              aria-label={t('menus.actions.editName', { name })}
              onClick={() => onEdit(action)}
            >
              {t('menus.actions.edit')}
            </Button>
          )}
          {capabilities.delete && (
            <Button
              type="button"
              variant="danger-ghost"
              size="xs"
              aria-label={t('menus.actions.deleteName', { name })}
              onClick={() => onDelete(action)}
            >
              {t('menus.actions.delete')}
            </Button>
          )}
        </div>
      ),
    };
  });

  return (
    <PageSection
      aria-label={t('menus.actionSection.label')}
      data-testid="menu-actions-card"
      title={t('menus.actionSection.title')}
      description={t('menus.actionSection.desc', { count: actions.length })}
      actions={
        capabilities.create ? (
          <Button type="button" size="sm" variant="outline" onClick={() => onCreate(menu)}>
            <Plus data-icon="inline-start" />
            {t('menus.actions.createAction')}
          </Button>
        ) : undefined
      }
    >
      <div data-testid="menu-action-list" className="grid">
        <DescriptionList
          items={items}
          density="compact"
          empty={t('menus.actionSection.empty')}
        />
      </div>
    </PageSection>
  );
}
