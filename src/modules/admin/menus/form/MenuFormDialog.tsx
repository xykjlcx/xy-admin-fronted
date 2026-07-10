import type { TFunction } from 'i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import type { SelectOption } from '@/components/ui/select';
import { lv } from '@/lib/localized';
import { MenuTypeSchema, type ManagedMenuType, type UpdateMenuInput } from '../api';
import { nextSiblingSort } from '../model';
import { MenuFormFields } from './MenuFormFields';
import { menuFormValuesToInput, useMenuForm } from './useMenuForm';
import type { MenuRecord } from '@/modules/types';

export interface MenuFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  subsystemKey: string;
  menus: MenuRecord[];
  locale: string;
  t: TFunction<'admin'>;
  initialMenu?: MenuRecord | null;
  initialParentId?: string | null;
  initialType?: ManagedMenuType;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dto: UpdateMenuInput) => void | Promise<void>;
}
function isDescendant(menuById: Map<string, MenuRecord>, candidateId: string, ancestorId: string) {
  const visited = new Set<string>();
  let currentId: string | null = candidateId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const parentId: string | null = menuById.get(currentId)?.parentId ?? null;
    if (parentId === ancestorId) return true;
    currentId = parentId;
  }

  return false;
}

function buildParentOptions(
  type: ManagedMenuType,
  menus: MenuRecord[],
  locale: string,
  rootLabel: string,
  editingId?: string,
): SelectOption[] {
  const rootOption = { value: '', label: rootLabel };
  if (type === 'dir') return [rootOption];

  const menuById = new Map(menus.map((menu) => [menu.id, menu]));
  const candidates = menus
    .filter((menu) => {
      if (menu.id === editingId) return false;
      if (editingId && isDescendant(menuById, menu.id, editingId)) return false;
      return type === 'menu' ? menu.type === 'dir' : menu.type === 'menu';
    })
    .toSorted((a, b) => a.sort - b.sort)
    .map((menu) => ({ value: menu.id, label: lv(menu.label, locale) }));

  return type === 'menu' ? [rootOption, ...candidates] : candidates;
}

export function MenuFormDialog(props: MenuFormDialogProps) {
  const dialogKey =
    props.mode === 'edit' && props.initialMenu
      ? `edit-${props.initialMenu.id}`
      : `create-${props.initialType ?? 'dir'}-${props.initialParentId ?? 'root'}`;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <MenuFormDialogContent key={dialogKey} {...props} />}
    </Dialog>
  );
}

function MenuFormDialogContent(props: MenuFormDialogProps) {
  const form = useMenuForm(props);
  const { formState, handleSubmit, setValue, watch } = form;
  const type = watch('type');
  const editingId = props.initialMenu?.id;
  const contextLocked = props.mode === 'create' && props.initialParentId != null;
  const typeLocked =
    contextLocked || (!!props.initialMenu && props.menus.some((menu) => menu.parentId === props.initialMenu?.id));
  const rootLabel = props.t('menus.form.rootParent');
  const parentOptions = buildParentOptions(type, props.menus, props.locale, rootLabel, editingId);
  const submit = handleSubmit(async (values) => {
    await props.onSubmit(menuFormValuesToInput(values, props.initialMenu, props.locale));
  });

  const changeType = (value: string) => {
    const parsed = MenuTypeSchema.safeParse(value);
    if (!parsed.success) return;

    const nextType = parsed.data;
    const options = buildParentOptions(nextType, props.menus, props.locale, rootLabel, editingId);
    const parentId = nextType === 'dir' ? '' : (options[0]?.value ?? '');
    setValue('type', nextType, { shouldDirty: true, shouldValidate: true });
    setValue('parentId', parentId, { shouldDirty: true, shouldValidate: true });
    setValue('path', nextType === 'menu' ? watch('path') : '', { shouldValidate: true });
    setValue('permission', nextType === 'dir' ? '' : watch('permission'), { shouldValidate: true });
    setValue('sort', String(nextSiblingSort(props.menus, props.subsystemKey, parentId || null)), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const changeParent = (parentId: string) => {
    setValue('parentId', parentId, { shouldDirty: true, shouldValidate: true });
    setValue('sort', String(nextSiblingSort(props.menus, props.subsystemKey, parentId || null)), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <FormDialogContent
      title={props.mode === 'create' ? props.t('menus.dialog.createTitle') : props.t('menus.dialog.editTitle')}
      size="lg"
      cancelText={props.t('menus.actions.cancel')}
      submitText={props.mode === 'create' ? props.t('menus.actions.confirmCreate') : props.t('menus.actions.save')}
      submitDisabled={!formState.isValid}
      submitLoading={formState.isSubmitting}
      onCancel={() => props.onOpenChange(false)}
      onSubmit={() => {
        void submit();
      }}
    >
      <MenuFormFields
        form={form}
        locale={props.locale}
        t={props.t}
        typeLocked={typeLocked}
        contextLocked={contextLocked}
        parentOptions={parentOptions}
        onTypeChange={changeType}
        onParentChange={changeParent}
      />
    </FormDialogContent>
  );
}
