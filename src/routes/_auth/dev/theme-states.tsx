import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ACCENTS, type AccentKey } from '@/lib/appearance-dom';
import { useAppearance } from '@/stores/appearance';
import { NativeSelect } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { SelectControl } from '@/components/ui/select';

export const Route = createFileRoute('/_auth/dev/theme-states')({
  component: ThemeStatesRoute,
});

const flavors = ['feishu', 'claude', 'shadcn'] as const;
const modes = ['light', 'dark'] as const;
const flavorLabelKeys: Record<(typeof flavors)[number], string> = {
  feishu: 'shell.appearanceDrawer.flavorFeishu',
  claude: 'shell.appearanceDrawer.flavorClaude',
  shadcn: 'shell.appearanceDrawer.flavorShadcn',
};
const modeLabelKeys: Record<(typeof modes)[number], string> = {
  light: 'dev.themeStates.light',
  dark: 'dev.themeStates.dark',
};

function ThemeStatesRoute() {
  const { t } = useTranslation();
  const { flavor, mode, accent, customAccent, set, setFlavor } = useAppearance();
  const fieldSelectOptions = [
    { value: '', label: t('dev.themeStates.fieldSelectPlaceholder') },
    { value: 'rd', label: t('dev.themeStates.fieldResearch') },
    { value: 'ops', label: t('dev.themeStates.fieldOperations') },
  ];

  return (
    <main className="flex min-h-full flex-col gap-4 bg-page p-6 text-text">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-normal text-text-3">
          {t('dev.themeStates.eyebrow')}
        </p>
        <h1 className="ui-page-title text-xl font-semibold text-text">{t('dev.themeStates.title')}</h1>
        <p className="max-w-[720px] text-sm text-text-2">
          {t('dev.themeStates.description')}
        </p>
      </header>

      <section className="grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-card-sm md:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          {t('shell.appearanceDrawer.flavor')}
          <NativeSelect
            value={flavor}
            onChange={(event) => setFlavor(event.currentTarget.value as typeof flavor)}
          >
            {flavors.map((item) => (
              <option key={item} value={item}>
                {t(flavorLabelKeys[item])}
              </option>
            ))}
          </NativeSelect>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          {t('dev.themeStates.mode')}
          <NativeSelect value={mode} onChange={(event) => set({ mode: event.currentTarget.value as typeof mode })}>
            {modes.map((item) => (
              <option key={item} value={item}>
                {t(modeLabelKeys[item])}
              </option>
            ))}
          </NativeSelect>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          {t('shell.appearanceDrawer.accent')}
          <NativeSelect
            value={accent}
            onChange={(event) => set({ accent: event.currentTarget.value as AccentKey })}
          >
            {ACCENTS.map((item) => (
              <option key={item.key} value={item.key}>
                {t(`shell.appearanceDrawer.${item.labelKey}`)}
              </option>
            ))}
            <option value="custom">{t('shell.appearanceDrawer.accentCustom')}</option>
          </NativeSelect>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          {t('shell.appearanceDrawer.accentCustom')}
          <Input
            value={customAccent}
            onChange={(event) => set({ accent: 'custom', customAccent: event.currentTarget.value })}
            placeholder={t('dev.themeStates.customAccentPlaceholder')}
          />
        </label>
      </section>

      <section className="grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-card-sm md:grid-cols-3">
        <div className="rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.primaryAction')}</p>
          <div className="mt-3 flex gap-2">
            <Button>{t('dev.themeStates.primary')}</Button>
            <Button variant="outline">{t('dev.themeStates.outline')}</Button>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.currentContract')}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-text-2">
            <dt>flavor</dt>
            <dd className="font-medium text-text">{flavor}</dd>
            <dt>mode</dt>
            <dd className="font-medium text-text">{mode}</dd>
            <dt>accent</dt>
            <dd className="font-medium text-text">{accent}</dd>
          </dl>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-card-sm">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">{t('dev.themeStates.fieldMatrix')}</h2>
          <p className="text-sm text-text-2">{t('dev.themeStates.fieldMatrixDesc')}</p>
        </div>
        <FieldGroup className="grid gap-4 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="theme-field-default">{t('dev.themeStates.fieldDefault')}</FieldLabel>
            <Input id="theme-field-default" placeholder={t('dev.themeStates.focusPlaceholder')} />
            <FieldDescription>{t('dev.themeStates.fieldDefaultDesc')}</FieldDescription>
          </Field>

          <Field data-invalid>
            <FieldLabel htmlFor="theme-field-invalid">{t('dev.themeStates.fieldInvalid')}</FieldLabel>
            <Input id="theme-field-invalid" aria-invalid defaultValue="abc" />
            <FieldError>{t('dev.themeStates.fieldInvalidDesc')}</FieldError>
          </Field>

          <Field data-disabled>
            <FieldLabel htmlFor="theme-field-disabled">{t('dev.themeStates.fieldDisabled')}</FieldLabel>
            <Input id="theme-field-disabled" disabled defaultValue={t('dev.themeStates.fieldDisabledValue')} readOnly />
            <FieldDescription>{t('dev.themeStates.fieldDisabledDesc')}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="theme-field-readonly">{t('dev.themeStates.fieldReadonly')}</FieldLabel>
            <Input id="theme-field-readonly" readOnly defaultValue={t('dev.themeStates.fieldReadonlyValue')} />
          </Field>

          <Field>
            <FieldLabel htmlFor="theme-field-addon">{t('dev.themeStates.fieldAddon')}</FieldLabel>
            <Input id="theme-field-addon" addonBefore="https://" defaultValue="acme.com" />
          </Field>

          <Field>
            <FieldLabel htmlFor="theme-field-native-select">{t('dev.themeStates.fieldNativeSelect')}</FieldLabel>
            <NativeSelect id="theme-field-native-select" defaultValue="active">
              <option value="active">{t('dev.themeStates.fieldActive')}</option>
              <option value="disabled">{t('dev.themeStates.fieldInactive')}</option>
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel>{t('dev.themeStates.fieldSelect')}</FieldLabel>
            <SelectControl
              value=""
              options={fieldSelectOptions}
              placeholder={t('dev.themeStates.fieldSelectPlaceholder')}
              onValueChange={() => undefined}
            />
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="theme-field-textarea">{t('dev.themeStates.fieldTextarea')}</FieldLabel>
            <Textarea id="theme-field-textarea" placeholder={t('dev.themeStates.fieldTextareaPlaceholder')} />
          </Field>
        </FieldGroup>
      </section>
    </main>
  );
}
