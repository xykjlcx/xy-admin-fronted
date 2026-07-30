import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/pro/QueryState';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { SelectControl } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { preferenceQuery, profileApi, profileKeys, type PreferenceDto } from '../api';

export function ProfilePreferencesPanel() {
  const { t, i18n } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const queryClient = useQueryClient();
  const result = useQuery(preferenceQuery);
  const [draft, setDraft] = useState<Partial<PreferenceDto>>({});
  const form = result.data ? { ...result.data, ...draft } : undefined;
  const save = useMutation({
    mutationFn: profileApi.updatePreferences,
    onSuccess: async (data) => {
      setDraft({});
      queryClient.setQueryData(profileKeys.preferences(), data);
      await i18n.changeLanguage(data.language);
      toast.success(t('profile.toast.preferencesSaved'));
    },
  });
  if (!form)
    return (
      <QueryState
        data={result.data}
        pending={result.isPending}
        error={result.isError}
        loadingLabel={t('profile.sections.preferences')}
        errorLabel={tCommon('errors.refetchFailed')}
        retryLabel={tCommon('errors.retry')}
        onRetry={() => void result.refetch()}
      >
        {() => null}
      </QueryState>
    );
  return (
    <Card spacing="compact">
      <CardHeader>
        <CardTitle>{t('profile.sections.preferences')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Field>
          <FieldLabel>{t('profile.preferences.language')}</FieldLabel>
          <SelectControl
            aria-label={t('profile.preferences.language')}
            value={form.language}
            options={[
              { value: 'zh-CN', label: t('profile.preferences.languages.zh') },
              { value: 'en-US', label: t('profile.preferences.languages.en') },
            ]}
            onValueChange={(language) =>
              setDraft((current) => ({ ...current, language: language === 'en-US' ? 'en-US' : 'zh-CN' }))
            }
          />
        </Field>
        <Field>
          <FieldLabel>{t('profile.preferences.timezone')}</FieldLabel>
          <SelectControl
            aria-label={t('profile.preferences.timezone')}
            value={form.timezone}
            options={[
              { value: 'Asia/Shanghai', label: 'Asia/Shanghai (GMT+8)' },
              { value: 'Europe/London', label: 'Europe/London (GMT+0)' },
              { value: 'America/Los_Angeles', label: 'America/Los_Angeles (GMT-8)' },
            ]}
            onValueChange={(timezone) => setDraft((current) => ({ ...current, timezone }))}
          />
        </Field>
        {(['weeklyDigest', 'compactNotifications'] as const).map((key) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">{t(`profile.preferences.${key}.title`)}</p>
              <p className="mt-1 text-xs text-text-3">{t(`profile.preferences.${key}.desc`)}</p>
            </div>
            <Switch
              checked={form[key]}
              aria-label={t(`profile.preferences.${key}.title`)}
              onCheckedChange={(checked) => setDraft((current) => ({ ...current, [key]: checked }))}
            />
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button onClick={() => save.mutate(form)} loading={save.isPending}>
          {t('profile.actions.savePreferences')}
        </Button>
      </CardFooter>
    </Card>
  );
}
