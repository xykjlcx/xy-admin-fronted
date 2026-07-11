import type { TFunction } from 'i18next';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { lv } from '@/lib/localized';
import { MenuFormDialog } from '../form/MenuFormDialog';
import { SubsystemFormDialog } from '../form/SubsystemFormDialog';
import type {
  CreateSubsystemInput,
  UpdateMenuInput,
  UpdateSubsystemInput,
} from '../api';
import type { MenuOverlay } from '../types';
import type { MenuRecord, Subsystem } from '@/modules/types';

interface MenuOverlaysProps {
  overlay: MenuOverlay;
  activeSubsystemKey: string;
  menus: MenuRecord[];
  subsystems: Subsystem[];
  locale: string;
  t: TFunction<'admin'>;
  onClose: () => void;
  onSubmitMenu: (dto: UpdateMenuInput) => void | Promise<void>;
  onSubmitSubsystem: (
    payload:
      | { mode: 'create'; dto: CreateSubsystemInput }
      | { mode: 'edit'; key: string; dto: UpdateSubsystemInput },
  ) => void | Promise<void>;
  onConfirmDelete: () => void | Promise<void>;
  codeOwnedLocked?: boolean;
}

export function MenuOverlays(props: MenuOverlaysProps) {
  const closeWhenClosed = (open: boolean) => {
    if (!open) props.onClose();
  };

  return (
    <>
      {props.overlay.kind === 'subsystem-form' ? (
        <SubsystemFormDialog
          state={props.overlay.state}
          subsystems={props.subsystems}
          locale={props.locale}
          t={props.t}
          onOpenChange={closeWhenClosed}
          onSubmit={props.onSubmitSubsystem}
        />
      ) : null}

      {props.overlay.kind === 'menu-form' ? (
        <MenuFormDialog
          open
          mode={props.overlay.state.mode}
          subsystemKey={props.activeSubsystemKey}
          menus={props.menus}
          locale={props.locale}
          t={props.t}
          initialMenu={props.overlay.state.mode === 'edit' ? props.overlay.state.menu : null}
          initialParentId={
            props.overlay.state.mode === 'create' ? props.overlay.state.parentId : null
          }
          initialType={
            props.overlay.state.mode === 'create' ? props.overlay.state.type : undefined
          }
          onOpenChange={closeWhenClosed}
          onSubmit={props.onSubmitMenu}
          codeOwnedLocked={props.codeOwnedLocked}
        />
      ) : null}

      <ConfirmDialog
        open={props.overlay.kind === 'delete'}
        title={props.t('menus.dialog.deleteTitle')}
        description={props.t('menus.dialog.deleteDesc', {
          name:
            props.overlay.kind === 'delete'
              ? lv(props.overlay.menu.label, props.locale)
              : '',
        })}
        cancelText={props.t('menus.actions.cancel')}
        confirmText={props.t('menus.actions.confirmDelete')}
        onOpenChange={closeWhenClosed}
        onConfirm={props.onConfirmDelete}
      />
    </>
  );
}
