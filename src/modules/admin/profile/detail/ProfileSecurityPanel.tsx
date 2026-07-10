import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/pro/QueryState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { profileApi, profileKeys, securitySettingsQuery, type SecuritySettingsDto } from '../api';
import { PasswordFormDialog } from '../form';

export function ProfileSecurityPanel({ openPasswordInitially = false }: { openPasswordInitially?: boolean }) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const queryClient = useQueryClient();
  const [passwordOpen, setPasswordOpen] = useState(openPasswordInitially);
  const result = useQuery(securitySettingsQuery);
  const update = useMutation({
    mutationFn: profileApi.updateSecurity,
    onSuccess: (data) => queryClient.setQueryData(profileKeys.security(), data),
  });
  const changePassword = useMutation({
    mutationFn: profileApi.changePassword,
    onSuccess: () => toast.success(t('profile.toast.passwordChanged')),
  });
  const settings = result.data;
  if (!settings)
    return (
      <QueryState
        data={settings}
        pending={result.isPending}
        error={result.isError}
        loadingLabel={t('profile.sections.security')}
        errorLabel={tCommon('errors.refetchFailed')}
        retryLabel={tCommon('errors.retry')}
        onRetry={() => void result.refetch()}
      >
        {() => null}
      </QueryState>
    );
  const rows: { key: keyof SecuritySettingsDto; icon: typeof ShieldCheck }[] = [
    { key: 'twoFactor', icon: ShieldCheck },
    { key: 'emailAlert', icon: Mail },
    { key: 'newDeviceAlert', icon: Smartphone },
  ];
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.sections.security')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 border-b border-border py-4">
            <KeyRound className="text-text-2" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t('profile.password.loginPassword')}</p>
              <p className="mt-1 text-xs text-text-3">{t('profile.password.lastUpdated')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
              {t('profile.password.action')}
            </Button>
          </div>
          {rows.map(({ key, icon: Icon }) => (
            <div key={key} className="flex items-center gap-4 border-b border-border py-4 last:border-b-0">
              <Icon className="text-text-2" />
              <div className="flex-1">
                <p className="text-sm font-medium">{t(`profile.security.${key}.title`)}</p>
                <p className="mt-1 text-xs text-text-3">{t(`profile.security.${key}.desc`)}</p>
              </div>
              <Switch
                aria-label={t(`profile.security.${key}.title`)}
                checked={settings[key]}
                onCheckedChange={(checked) => update.mutate({ ...settings, [key]: checked })}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <PasswordFormDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        onSubmit={async (input) => {
          await changePassword.mutateAsync(input);
        }}
      />
    </>
  );
}
