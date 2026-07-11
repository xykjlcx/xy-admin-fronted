import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { lv, mergeLocalized } from '@/lib/localized';
import {
  CreateSubsystemSchema,
  UpdateSubsystemSchema,
  type CreateSubsystemInput,
  type UpdateSubsystemInput,
} from '../api';
import type { SubsystemFormState } from '../types';
import type { Subsystem } from '@/modules/types';

const DEFAULT_SUBSYSTEM_ICON = 'layout-grid';
const DEFAULT_SUBSYSTEM_COLOR = 'var(--accent-emphasis)';

const SubsystemFormSchema = z.object({
  key: z.string().trim().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().trim().min(1),
  desc: z.string().trim().min(1),
  icon: z.string().trim().min(1),
  home: z.string().startsWith('/'),
  enabled: z.boolean(),
});

export type SubsystemFormValues = z.infer<typeof SubsystemFormSchema>;

export function useSubsystemForm({
  state,
  subsystems,
  locale,
}: {
  state: SubsystemFormState;
  subsystems: Subsystem[];
  locale: string;
}) {
  const schema = SubsystemFormSchema.superRefine((values, context) => {
    if (state.mode === 'create' && subsystems.some((subsystem) => subsystem.key === values.key)) {
      context.addIssue({ code: 'custom', path: ['key'], message: 'keyDuplicated' });
    }
  });

  return useForm<SubsystemFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues:
      state.mode === 'create'
        ? { key: '', name: '', desc: '', icon: DEFAULT_SUBSYSTEM_ICON, home: '', enabled: true }
        : {
            key: state.subsystem.key,
            name: lv(state.subsystem.label, locale),
            desc: lv(state.subsystem.desc, locale),
            icon: state.subsystem.icon,
            home: state.subsystem.home,
            enabled: state.subsystem.enabled,
          },
  });
}

export function subsystemFormValuesToPayload(
  values: SubsystemFormValues,
  state: SubsystemFormState,
  subsystems: Subsystem[],
  locale: string,
):
  | { mode: 'create'; dto: CreateSubsystemInput }
  | { mode: 'edit'; key: string; dto: UpdateSubsystemInput } {
  if (state.mode === 'create') {
    return {
      mode: 'create',
      dto: CreateSubsystemSchema.parse({
        key: values.key,
        label: mergeLocalized(undefined, locale, values.name),
        desc: mergeLocalized(undefined, locale, values.desc),
        icon: values.icon,
        color: DEFAULT_SUBSYSTEM_COLOR,
        home: values.home,
        builtin: false,
        enabled: values.enabled,
        sort: Math.max(0, ...subsystems.map((subsystem) => subsystem.sort)) + 1,
      }),
    };
  }

  return {
    mode: 'edit',
    key: state.subsystem.key,
    dto: UpdateSubsystemSchema.parse({
      label: mergeLocalized(state.subsystem.label, locale, values.name),
      desc: mergeLocalized(state.subsystem.desc, locale, values.desc),
      icon: values.icon,
      color: state.subsystem.color,
      home: values.home,
      enabled: values.enabled,
    }),
  };
}
