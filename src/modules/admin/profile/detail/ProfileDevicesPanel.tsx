import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Monitor, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/pro/QueryState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { profileApi, profileKeys, loginDevicesQuery } from '../api';

export function ProfileDevicesPanel() {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const result = useQuery(loginDevicesQuery);
  const remove = useMutation({
    mutationFn: profileApi.removeDevice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKeys.devices() });
      setMessage(t('profile.devices.removed'));
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.sections.devices')}</CardTitle>
      </CardHeader>
      <CardContent>
        {message && <p className="mb-3 text-sm text-success">{message}</p>}
        <QueryState
          data={result.data}
          pending={result.isPending}
          error={result.isError}
          loadingLabel={t('profile.sections.devices')}
          errorLabel={tCommon('errors.refetchFailed')}
          retryLabel={tCommon('errors.retry')}
          onRetry={() => void result.refetch()}
        >
          {(devices) => devices.map((device) => (
          <div
            key={device.id}
            className="flex items-center gap-4 border-b border-border py-4 last:border-b-0"
          >
            {device.name.includes('iOS') ? (
              <Smartphone className="text-text-2" />
            ) : (
              <Monitor className="text-text-2" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {device.name}
                {device.current ? ` · ${t('profile.devices.current')}` : ''}
              </p>
              <p className="mt-1 text-xs text-text-3">
                {device.location} · {device.ip} · {device.lastActive}
              </p>
            </div>
            {!device.current && (
              <Button
                variant="outline"
                size="sm"
                aria-label={t('profile.devices.remove')}
                onClick={() => remove.mutate(device.id)}
              >
                {t('profile.devices.remove')}
              </Button>
            )}
          </div>
          ))}
        </QueryState>
      </CardContent>
    </Card>
  );
}
