import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { QueryState } from '@/components/pro/QueryState';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { profileApi, profileKeys, profileQuery } from '../api';
import { ProfileFormDialog } from '../form';

function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl>
      {rows.map((row) => (
        <div key={row.label} className="flex gap-4 py-2 text-sm">
          <dt className="w-[calc(92px*var(--app-scale))] shrink-0 text-text-3">{row.label}</dt>
          <dd className="text-text">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProfileInfoPanel({
  editing,
  onEditingChange,
}: {
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
}) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const queryClient = useQueryClient();
  const result = useQuery(profileQuery);
  const update = useMutation({
    mutationFn: profileApi.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
      toast.success(t('profile.toast.saved'));
    },
  });
  const profile = result.data;
  if (!profile)
    return (
      <QueryState
        data={profile}
        pending={result.isPending}
        error={result.isError}
        loadingLabel={t('profile.title')}
        errorLabel={tCommon('errors.refetchFailed')}
        retryLabel={tCommon('errors.retry')}
        onRetry={() => void result.refetch()}
      >
        {() => null}
      </QueryState>
    );
  const basic = [
    { field: 'name', value: profile.name },
    { field: 'email', value: profile.email },
    { field: 'phone', value: profile.phone },
    { field: 'department', value: profile.department },
    { field: 'role', value: profile.role },
    { field: 'location', value: profile.location },
  ].map((item) => ({ label: t(`profile.fields.${item.field}`), value: item.value }));
  const work = [
    { field: 'employeeNo', value: profile.employeeNo },
    { field: 'title', value: profile.title },
    { field: 'joinedAt', value: profile.joinedAt },
    { field: 'manager', value: profile.manager },
    { field: 'language', value: profile.language },
    { field: 'timezone', value: profile.timezone },
  ].map((item) => ({ label: t(`profile.fields.${item.field}`), value: item.value }));
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.sections.basic')}</CardTitle>
            <CardAction>
              <Button variant="link" size="sm" onClick={() => onEditingChange(true)}>
                {t('profile.actions.editShort')}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Rows rows={basic} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.sections.work')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Rows rows={work} />
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t('profile.sections.bio')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-text-2">{profile.bio}</p>
        </CardContent>
      </Card>
      {editing && (
        <ProfileFormDialog
          open
          profile={profile}
          onOpenChange={onEditingChange}
          onSubmit={async (input) => {
            await update.mutateAsync(input);
          }}
        />
      )}
    </>
  );
}
