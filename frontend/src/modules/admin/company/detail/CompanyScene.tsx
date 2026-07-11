import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageFrame } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { matchPermission } from '@/lib/permission';
import { companyApi, companyKeys, companyQuery } from '../api';
import { CompanyFormDialog } from '../form';

function InformationGrid({ items }: { items: { label: ReactNode; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-12 gap-y-5 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={index}>
          <dt className="text-sm text-text-3">{item.label}</dt>
          <dd className="mt-1 text-sm text-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CompanyScene({ permissions, systemAdmin = false }: { permissions: string[]; systemAdmin?: boolean }) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const result = useQuery(companyQuery);
  const update = useMutation({
    mutationFn: companyApi.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: companyKeys.all });
      toast.success(t('company.toast.saved'));
    },
  });
  const company = result.data;
  if (!company)
    return (
      <PageFrame breadcrumbs={[{ label: t('company.breadcrumbGroup') }, { label: t('company.title') }]}>
        <QueryState
          data={company}
          pending={result.isPending}
          error={result.isError}
          loadingLabel={t('company.title')}
          errorLabel={tCommon('errors.refetchFailed')}
          retryLabel={tCommon('errors.retry')}
          onRetry={() => void result.refetch()}
        >
          {() => null}
        </QueryState>
      </PageFrame>
    );
  const details = [
    { field: 'domain', value: company.domain },
    { field: 'code', value: company.code },
    { field: 'industry', value: company.industry },
    { field: 'scale', value: company.scale },
    { field: 'dataResidency', value: company.dataResidency },
    { field: 'createdAt', value: company.createdAt },
  ].map((item) => ({ label: t(`company.fields.${item.field}`), value: item.value }));
  const contacts = [
    { field: 'contactName', value: company.contactName },
    { field: 'contactEmail', value: company.contactEmail },
    { field: 'contactPhone', value: company.contactPhone },
    { field: 'landline', value: company.landline },
    { field: 'address', value: company.address },
    { field: 'postalCode', value: company.postalCode },
  ].map((item) => ({ label: t(`company.fields.${item.field}`), value: item.value }));
  return (
    <PageFrame breadcrumbs={[{ label: t('company.breadcrumbGroup') }, { label: t('company.title') }]}>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('company.sections.basic')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 rounded-12 border border-border bg-surface-2 p-5">
              <div className="flex size-14 items-center justify-center rounded-12 bg-(--accent-emphasis) text-lg font-semibold text-(--button-primary-fg)">
                <Building2 />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-text">{company.name}</h1>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={company.verified ? 'success' : 'warning'}>
                    {t(company.verified ? 'company.verified' : 'company.unverified')}
                  </Badge>
                  <span className="text-sm text-text-2">{t('company.verifyHint')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('company.sections.more')}</CardTitle>
            {matchPermission({ permissions, systemAdmin }, 'sys:org:edit') && (
              <CardAction>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t('company.actions.edit')}
                  onClick={() => setEditing(true)}
                >
                  <Pencil data-icon="inline-start" />
                  {t('company.actions.editShort')}
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <InformationGrid items={details} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('company.sections.contacts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <InformationGrid items={contacts} />
          </CardContent>
        </Card>
      </div>
      {editing && (
        <CompanyFormDialog
          open
          company={company}
          onOpenChange={setEditing}
          onSubmit={async (input) => {
            await update.mutateAsync(input);
          }}
        />
      )}
    </PageFrame>
  );
}
