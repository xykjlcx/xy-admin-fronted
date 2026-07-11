import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { lv, mergeLocalized } from '@/lib/localized';
import { UpdateMenuSchema, type ManagedMenuType, type UpdateMenuInput } from '../api';
import { nextSiblingSort } from '../model';
import type { MenuRecord } from '@/modules/types';

const MenuFormSchema = z
  .object({
    type: z.enum(['dir', 'menu', 'action']),
    parentId: z.string(),
    name: z.string().trim().min(1),
    icon: z.string(),
    shortLabel: z.string(),
    path: z.string(),
    permission: z.string(),
    visible: z.boolean(),
    sort: z.string().regex(/^\d+$/),
  })
  .superRefine((values, context) => {
    if (values.type === 'menu' && !values.path.startsWith('/')) {
      context.addIssue({ code: 'custom', path: ['path'], message: 'pathRequired' });
    }
    if (values.type === 'action' && !values.parentId) {
      context.addIssue({ code: 'custom', path: ['parentId'], message: 'parentRequired' });
    }
    if (values.type === 'action' && !values.permission.trim()) {
      context.addIssue({ code: 'custom', path: ['permission'], message: 'permissionRequired' });
    }
  });

export type MenuFormValues = z.infer<typeof MenuFormSchema>;

interface UseMenuFormParams {
  mode: 'create' | 'edit';
  subsystemKey: string;
  menus: MenuRecord[];
  locale: string;
  initialMenu?: MenuRecord | null;
  initialParentId?: string | null;
  initialType?: ManagedMenuType;
}

export function useMenuForm({
  mode,
  subsystemKey,
  menus,
  locale,
  initialMenu,
  initialParentId,
  initialType,
}: UseMenuFormParams) {
  const type = mode === 'edit' && initialMenu ? initialMenu.type : (initialType ?? 'dir');
  const parentId = mode === 'edit' && initialMenu ? initialMenu.parentId : (initialParentId ?? null);

  return useForm<MenuFormValues>({
    resolver: zodResolver(MenuFormSchema),
    mode: 'onChange',
    defaultValues:
      mode === 'edit' && initialMenu
        ? {
            type,
            parentId: parentId ?? '',
            name: lv(initialMenu.label, locale),
            icon: initialMenu.icon ?? '',
            shortLabel: lv(initialMenu.shortLabel, locale),
            path: initialMenu.path ?? '',
            permission: initialMenu.permission ?? '',
            visible: initialMenu.visible,
            sort: String(initialMenu.sort),
          }
        : {
            type,
            parentId: parentId ?? '',
            name: '',
            icon: '',
            shortLabel: '',
            path: '',
            permission: '',
            visible: true,
            sort: String(nextSiblingSort(menus, subsystemKey, parentId)),
          },
  });
}

export function menuFormValuesToInput(
  values: MenuFormValues,
  initialMenu: MenuRecord | null | undefined,
  locale: string,
): UpdateMenuInput {
  const shortLabel = mergeLocalized(initialMenu?.shortLabel, locale, values.shortLabel);
  return UpdateMenuSchema.parse({
    type: values.type,
    parentId: values.parentId || null,
    label: mergeLocalized(initialMenu?.label, locale, values.name),
    icon: values.icon,
    shortLabel: values.type === 'action' || Object.keys(shortLabel).length === 0 ? undefined : shortLabel,
    path: values.type === 'menu' ? values.path : undefined,
    permission: values.type === 'dir' ? undefined : values.permission.trim() || undefined,
    visible: values.visible,
    sort: Number(values.sort),
  });
}
