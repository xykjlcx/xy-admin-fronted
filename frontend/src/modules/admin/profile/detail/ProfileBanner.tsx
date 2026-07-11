import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Pencil, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { QueryState } from '@/components/pro/QueryState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { profileQuery } from '../api';

export function ProfileBanner({ onEdit }: { onEdit: () => void }) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const result = useQuery(profileQuery);
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
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4">
        <div className="flex size-[calc(68px*var(--app-scale))] shrink-0 items-center justify-center rounded-16 bg-(--accent-emphasis) text-xl font-semibold text-(--button-primary-fg)">
          {profile.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold">{profile.name}</h1>
          <p className="mt-1 text-sm text-text-2">
            {profile.email} · {profile.company}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="primary">
              <ShieldCheck data-icon="inline-start" />
              {profile.role}
            </Badge>
            <Badge variant="neutral">{t('profile.lastActive', { value: profile.lastActive })}</Badge>
            {profile.emailVerified && (
              <Badge variant="success">
                <CheckCircle2 data-icon="inline-start" />
                {t('profile.emailVerified')}
              </Badge>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil data-icon="inline-start" />
          {t('profile.actions.edit')}
        </Button>
      </CardContent>
    </Card>
  );
}
