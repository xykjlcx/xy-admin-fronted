import type { TFunction } from 'i18next';
import { Edit3, Plus } from 'lucide-react';
import {
  PagePane,
  PagePaneBody,
  PagePaneFooter,
  PagePaneHeader,
} from '@/components/pro/PageScaffold';
import { SideCardList, type SideCardListItem } from '@/components/pro/SideList';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Icon } from '@/lib/icon-registry';
import { lv } from '@/lib/localized';
import type { MenuCapabilities } from '../types';
import type { Subsystem } from '@/modules/types';

export interface SubsystemPanelProps {
  subsystems: Subsystem[];
  activeKey: string;
  locale: string;
  t: TFunction<'admin'>;
  capabilities: MenuCapabilities;
  onSelect: (key: string) => void;
  onCreate: () => void;
  onEdit: (subsystem: Subsystem) => void;
}

function SubsystemPanelContent(props: SubsystemPanelProps) {
  const subsystemByKey = new Map(props.subsystems.map((subsystem) => [subsystem.key, subsystem]));
  const items: SideCardListItem[] = props.subsystems.map((subsystem) => {
    const name = lv(subsystem.label, props.locale);
    return {
      id: subsystem.key,
      label: name,
      ariaLabel: props.t('menus.actions.selectSubsystem', { name }),
      description: `${props.t(
        subsystem.builtin ? 'menus.subsystems.builtin' : 'menus.subsystems.custom',
      )} · ${props.t(
        subsystem.enabled ? 'menus.subsystems.enabled' : 'menus.subsystems.disabled',
      )}`,
      icon: <Icon name={subsystem.icon} />,
      action: props.capabilities.update ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={props.t('menus.actions.editSubsystem', { name })}
          title={props.t('menus.actions.edit')}
          onClick={() => props.onEdit(subsystem)}
        >
          <Edit3 data-icon="inline" />
        </Button>
      ) : undefined,
    };
  });

  return (
    <>
      <PagePaneBody>
        <SideCardList
          items={items}
          activeId={props.activeKey}
          onSelect={(key) => {
            if (subsystemByKey.has(key)) props.onSelect(key);
          }}
        />
      </PagePaneBody>
      {props.capabilities.create ? (
        <PagePaneFooter>
          <Button type="button" variant="dashed" block onClick={props.onCreate}>
            <Plus data-icon="inline-start" />
            {props.t('menus.actions.createSubsystem')}
          </Button>
        </PagePaneFooter>
      ) : null}
    </>
  );
}

export function SubsystemPanel(props: SubsystemPanelProps) {
  return (
    <PagePane
      variant="navigation"
      aria-label={props.t('menus.subsystems.listLabel')}
      className="hidden lg:flex"
    >
      <PagePaneHeader title={props.t('menus.subsystems.title')} />
      <SubsystemPanelContent {...props} />
    </PagePane>
  );
}

export function SubsystemSheet({
  open,
  onOpenChange,
  ...props
}: SubsystemPanelProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const closeThen = <T,>(callback: (value: T) => void) => (value: T) => {
    onOpenChange(false);
    callback(value);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="gap-0 overflow-y-auto">
        <SheetTitle className="sr-only">{props.t('menus.subsystems.title')}</SheetTitle>
        <PagePaneHeader title={props.t('menus.subsystems.title')} />
        <SubsystemPanelContent
          {...props}
          onSelect={closeThen(props.onSelect)}
          onCreate={() => {
            onOpenChange(false);
            props.onCreate();
          }}
          onEdit={closeThen(props.onEdit)}
        />
      </SheetContent>
    </Sheet>
  );
}
