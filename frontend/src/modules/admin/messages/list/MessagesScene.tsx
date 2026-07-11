import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageFrame, PageSurface, PageTabs, type PageTabItem } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { SideList } from '@/components/pro/SideList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { matchPermission } from '@/lib/permission';
import { messageApi, messageKeys, messagesQuery, type MessageCategory, type MessageStatus } from '../api';

const categoryTone: Record<MessageCategory, 'warning' | 'danger' | 'primary'> = {
  approval: 'warning',
  security: 'danger',
  system: 'primary',
};

export function MessagesScene({ permissions, systemAdmin = false }: { permissions: string[]; systemAdmin?: boolean }) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<MessageStatus>('all');
  const [selectedId, setSelectedId] = useState('');
  const result = useQuery(messagesQuery(status));
  const messages = result.data?.list ?? [];
  const unreadCount = result.data?.unreadCount ?? 0;
  const selected = messages.find((message) => message.id === selectedId) ?? messages[0];
  const canDelete = matchPermission({ permissions, systemAdmin }, 'notice:msg:del');
  const canHandleApproval = matchPermission({ permissions, systemAdmin }, 'notice:msg:edit');
  const invalidate = () => queryClient.invalidateQueries({ queryKey: messageKeys.all });
  const markRead = useMutation({
    mutationFn: messageApi.markRead,
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: messageApi.markAllRead,
    onSuccess: async () => {
      await invalidate();
      toast.success(t('messages.toast.allRead'));
    },
  });
  const deleteMessage = useMutation({
    mutationFn: messageApi.deleteMessage,
    onSuccess: async () => {
      setSelectedId('');
      await invalidate();
      toast.success(t('messages.toast.deleted'));
    },
  });
  const handleApproval = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      messageApi.handleApproval(id, { action }),
    onSuccess: async (message) => {
      await invalidate();
      toast.success(t(`messages.toast.${message.approvalStatus}`));
    },
  });
  const tabs: PageTabItem<MessageStatus>[] = [
    { value: 'all', label: t('messages.tabs.all') },
    { value: 'unread', label: `${t('messages.tabs.unread')} ${unreadCount}` },
    { value: 'read', label: t('messages.tabs.read') },
  ];

  const openMessage = (id: string, unread: boolean) => {
    setSelectedId(id);
    if (unread) markRead.mutate(id);
  };

  return (
    <PageFrame
      breadcrumbs={[{ label: t('messages.breadcrumbGroup') }, { label: t('messages.title') }]}
      className="h-[calc(100vh-3.5rem)] overflow-hidden"
    >
      <PageSurface className="min-h-0 flex-1">
        <div className="flex items-end justify-between gap-4 border-b border-(--page-section-divider) px-5 pt-4">
          <PageTabs
            value={status}
            items={tabs}
            onValueChange={(next) => {
              setStatus(next);
              setSelectedId('');
            }}
          />
          <Button
            variant="text"
            disabled={unreadCount === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck data-icon="inline-start" />
            {t('messages.actions.readAll')}
          </Button>
        </div>
        <QueryState
          data={result.data}
          pending={result.isPending}
          error={result.isError}
          loadingLabel={t('messages.title')}
          errorLabel={tCommon('errors.refetchFailed')}
          retryLabel={tCommon('errors.retry')}
          onRetry={() => void result.refetch()}
          className="flex-1"
        >
          {() => <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <SideList
            className="h-[calc(240px*var(--app-scale))] w-full overflow-y-auto border-b border-r-0 lg:h-auto lg:w-[calc(380px*var(--app-scale))] lg:border-b-0 lg:border-r"
            activeId={selected?.id}
            onSelect={(id) => {
              const message = messages.find((item) => item.id === id);
              if (message) openMessage(id, message.unread);
            }}
            items={messages.map((message) => ({
              id: message.id,
              label: message.title,
              ariaLabel: `${message.title} ${message.unread ? t('messages.unread') : t('messages.read')}`,
              icon: (
                <Badge variant={categoryTone[message.category]}>
                  {t(`messages.categories.${message.category}`)}
                </Badge>
              ),
              meta: message.occurredAt.slice(5, 16),
            }))}
          />
          <section className="min-h-0 min-w-0 flex-1 overflow-y-auto p-7">
            {selected ? (
              <article>
                <div className="flex items-center justify-between gap-4">
                  <Badge variant={categoryTone[selected.category]}>
                    {t(`messages.categories.${selected.category}`)}
                  </Badge>
                  {canDelete && (
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      onClick={() => deleteMessage.mutate(selected.id)}
                    >
                      <Trash2 data-icon="inline-start" />
                      {t('messages.actions.delete')}
                    </Button>
                  )}
                </div>
                <h1 className="mt-4 text-xl font-semibold text-text">{selected.title}</h1>
                <div className="mt-3 flex items-center gap-4 border-b border-(--page-section-divider) pb-5 text-sm text-text-3">
                  <span>{t('messages.from', { from: selected.from })}</span>
                  <span>{selected.occurredAt}</span>
                </div>
                <p className="mt-5 max-w-3xl text-sm leading-7 text-text-2">{selected.body}</p>
                {canHandleApproval &&
                  selected.category === 'approval' &&
                  selected.approvalStatus === 'pending' && (
                    <div className="mt-7 flex gap-3">
                      <Button
                        loading={handleApproval.isPending}
                        onClick={() => handleApproval.mutate({ id: selected.id, action: 'approve' })}
                      >
                        {t('messages.actions.approve')}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={handleApproval.isPending}
                        onClick={() => handleApproval.mutate({ id: selected.id, action: 'reject' })}
                      >
                        {t('messages.actions.reject')}
                      </Button>
                    </div>
                  )}
                {selected.approvalStatus === 'approved' && (
                  <Badge className="mt-7" variant="success">
                    {t('messages.approval.approved')}
                  </Badge>
                )}
                {selected.approvalStatus === 'rejected' && (
                  <Badge className="mt-7" variant="danger">
                    {t('messages.approval.rejected')}
                  </Badge>
                )}
              </article>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-text-3">
                {t('messages.empty')}
              </div>
            )}
          </section>
          </div>}
        </QueryState>
      </PageSurface>
    </PageFrame>
  );
}
