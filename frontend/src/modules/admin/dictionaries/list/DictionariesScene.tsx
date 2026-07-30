import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { DataTable } from '@/components/pro/DataTable';
import { PageFrame, PageSurface } from '@/components/pro/PageScaffold';
import { SearchField } from '@/components/pro/SearchField';
import { SideList } from '@/components/pro/SideList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { matchPermission } from '@/lib/permission';
import {
  dictionariesQuery,
  dictionaryApi,
  dictionaryItemsQuery,
  dictionaryKeys,
  type CreateDictionaryItemInput,
  type DictionaryDto,
  type DictionaryItemDto,
  type UpdateDictionaryInput,
} from '../api';
import { DictionaryFormDialog, DictionaryItemFormDialog } from '../form';
import { dictionaryItemColumns } from './columns';

type DictionaryFormTarget = DictionaryDto | 'create' | null;
type ItemFormTarget = DictionaryItemDto | 'create' | null;
const emptyDictionaries: DictionaryDto[] = [];
const emptyItems: DictionaryItemDto[] = [];

export function DictionariesScene({ permissions, systemAdmin = false }: { permissions: string[]; systemAdmin?: boolean }) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const dictionariesResult = useQuery(dictionariesQuery);
  const dictionaries = dictionariesResult.data ?? emptyDictionaries;
  const [selectedId, setSelectedId] = useState('');
  const [catalogKeyword, setCatalogKeyword] = useState('');
  const [itemKeyword, setItemKeyword] = useState('');
  const [dictionaryFormTarget, setDictionaryFormTarget] = useState<DictionaryFormTarget>(null);
  const [itemFormTarget, setItemFormTarget] = useState<ItemFormTarget>(null);
  const [deleteDictionaryTarget, setDeleteDictionaryTarget] = useState<DictionaryDto | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<DictionaryItemDto | null>(null);
  const activeDictionary = dictionaries.find((dictionary) => dictionary.id === selectedId) ?? dictionaries[0];
  const activeId = activeDictionary?.id ?? '';
  const itemsResult = useQuery({
    ...dictionaryItemsQuery(activeId),
    enabled: !!activeId,
  });
  const items = itemsResult.data ?? emptyItems;
  const canCreate = matchPermission({ permissions, systemAdmin }, 'sys:dict:create');
  const canUpdate = matchPermission({ permissions, systemAdmin }, 'sys:dict:update');
  const canDelete = matchPermission({ permissions, systemAdmin }, 'sys:dict:delete');

  const invalidateCatalog = () => queryClient.invalidateQueries({ queryKey: dictionaryKeys.all });
  const createDictionary = useMutation({
    mutationFn: dictionaryApi.createDictionary,
    onSuccess: async (dictionary) => {
      await invalidateCatalog();
      setSelectedId(dictionary.id);
      toast.success(t('dictionaries.toast.created'));
    },
  });
  const updateDictionary = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDictionaryInput }) =>
      dictionaryApi.updateDictionary(id, input),
    onSuccess: async () => {
      await invalidateCatalog();
      toast.success(t('dictionaries.toast.updated'));
    },
  });
  const deleteDictionary = useMutation({
    mutationFn: dictionaryApi.deleteDictionary,
    onSuccess: async () => {
      setSelectedId('');
      await invalidateCatalog();
      toast.success(t('dictionaries.toast.deleted'));
    },
  });
  const createItem = useMutation({
    mutationFn: ({ dictionaryId, input }: { dictionaryId: string; input: CreateDictionaryItemInput }) =>
      dictionaryApi.createItem(dictionaryId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dictionaryKeys.items(activeId) });
      toast.success(t('dictionaries.toast.itemSaved'));
    },
  });
  const updateItem = useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: CreateDictionaryItemInput }) =>
      dictionaryApi.updateItem(activeId, itemId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dictionaryKeys.items(activeId) });
      toast.success(t('dictionaries.toast.itemSaved'));
    },
  });
  const setItemEnabled = useMutation({
    mutationFn: ({ itemId, enabled }: { itemId: string; enabled: boolean }) =>
      dictionaryApi.setItemEnabled(activeId, itemId, { enabled }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dictionaryKeys.items(activeId) });
    },
  });
  const deleteItem = useMutation({
    mutationFn: (itemId: string) => dictionaryApi.deleteItem(activeId, itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dictionaryKeys.items(activeId) });
      toast.success(t('dictionaries.toast.itemDeleted'));
    },
  });

  const visibleDictionaries = useMemo(() => {
    const keyword = catalogKeyword.trim().toLowerCase();
    if (!keyword) return dictionaries;
    return dictionaries.filter((dictionary) =>
      `${dictionary.name} ${dictionary.code}`.toLowerCase().includes(keyword),
    );
  }, [catalogKeyword, dictionaries]);
  const visibleItems = useMemo(() => {
    const keyword = itemKeyword.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) => `${item.label} ${item.value}`.toLowerCase().includes(keyword));
  }, [itemKeyword, items]);
  const columns = useMemo(
    () =>
      dictionaryItemColumns({
        labels: {
          label: t('dictionaries.columns.label'),
          value: t('dictionaries.columns.value'),
          sort: t('dictionaries.columns.sort'),
          status: t('dictionaries.columns.status'),
          remark: t('dictionaries.columns.remark'),
          actions: t('dictionaries.columns.actions'),
          enabled: t('dictionaries.status.enabled'),
          disabled: t('dictionaries.status.disabled'),
          edit: t('dictionaries.actions.edit'),
          delete: t('dictionaries.actions.delete'),
          more: t('dictionaries.actions.more'),
        },
        canUpdate,
        canDelete,
        onEdit: setItemFormTarget,
        onDelete: setDeleteItemTarget,
        onEnabledChange: (item, enabled) => setItemEnabled.mutate({ itemId: item.id, enabled }),
      }),
    [canDelete, canUpdate, setItemEnabled, t],
  );

  if (dictionariesResult.isError) {
    return (
      <PageFrame
        breadcrumbs={[{ label: t('dictionaries.breadcrumbGroup') }, { label: t('dictionaries.title') }]}
      >
        <PageSurface className="items-center justify-center gap-3 p-4">
          <p className="text-sm text-text-3">{t('dictionaries.error')}</p>
          <Button variant="secondary" onClick={() => void dictionariesResult.refetch()}>
            {t('dictionaries.actions.retry')}
          </Button>
        </PageSurface>
      </PageFrame>
    );
  }

  return (
    <PageFrame
      breadcrumbs={[{ label: t('dictionaries.breadcrumbGroup') }, { label: t('dictionaries.title') }]}
      className="h-[calc(100vh-3.5rem)] overflow-hidden"
    >
      <PageSurface className="min-h-0 flex-1 flex-row">
        <SideList
          items={visibleDictionaries.map((dictionary) => ({
            id: dictionary.id,
            label: dictionary.name,
            meta: dictionary.builtin ? t('dictionaries.builtin') : undefined,
          }))}
          activeId={activeId}
          onSelect={(id) => {
            setSelectedId(id);
            setItemKeyword('');
          }}
          search={
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-text">{t('dictionaries.catalogTitle')}</h2>
                {canCreate && (
                  <Button size="xs" onClick={() => setDictionaryFormTarget('create')}>
                    <Plus data-icon="inline-start" />
                    {t('dictionaries.actions.create')}
                  </Button>
                )}
              </div>
              <SearchField
                value={catalogKeyword}
                aria-label={t('dictionaries.catalogSearch')}
                placeholder={t('dictionaries.catalogSearch')}
                onChange={(event) => setCatalogKeyword(event.currentTarget.value)}
              />
            </div>
          }
        />

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-(--page-section-divider) px-4 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-semibold text-text">
                  {activeDictionary?.name ?? t('dictionaries.emptyCatalog')}
                </h2>
                {activeDictionary?.builtin && <Badge variant="primary">{t('dictionaries.builtin')}</Badge>}
              </div>
              {activeDictionary && (
                <div className="mt-1 flex items-center gap-2 text-xs text-text-3">
                  <span>{activeDictionary.code}</span>
                  <span>·</span>
                  <span>{activeDictionary.remark}</span>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {activeDictionary && canUpdate && (
                <Button variant="outline" size="sm" onClick={() => setDictionaryFormTarget(activeDictionary)}>
                  {t('dictionaries.actions.editDictionary')}
                </Button>
              )}
              {activeDictionary && canDelete && !activeDictionary.builtin && (
                <Button
                  variant="danger-ghost"
                  size="sm"
                  onClick={() => setDeleteDictionaryTarget(activeDictionary)}
                >
                  {t('dictionaries.actions.deleteDictionary')}
                </Button>
              )}
              {activeDictionary && canCreate && (
                <Button size="sm" onClick={() => setItemFormTarget('create')}>
                  <Plus data-icon="inline-start" />
                  {t('dictionaries.actions.createItem')}
                </Button>
              )}
            </div>
          </header>
          <div className="border-b border-(--page-section-divider) px-4 py-2.5">
            <SearchField
              value={itemKeyword}
              aria-label={t('dictionaries.itemSearch')}
              placeholder={t('dictionaries.itemSearch')}
              onChange={(event) => setItemKeyword(event.currentTarget.value)}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <DataTable
              columns={columns}
              data={visibleItems}
              rowKey={(item) => item.id}
              loading={itemsResult.isPending}
              emptyText={t('dictionaries.emptyItems')}
              loadingText={t('dictionaries.loadingItems')}
            />
          </div>
        </section>
      </PageSurface>

      {dictionaryFormTarget && (
        <DictionaryFormDialog
          key={dictionaryFormTarget === 'create' ? 'create' : dictionaryFormTarget.id}
          open
          dictionary={dictionaryFormTarget === 'create' ? undefined : dictionaryFormTarget}
          onOpenChange={(open) => !open && setDictionaryFormTarget(null)}
          onSubmit={async (input) => {
            if ('code' in input) await createDictionary.mutateAsync(input);
            else if (dictionaryFormTarget !== 'create') {
              await updateDictionary.mutateAsync({ id: dictionaryFormTarget.id, input });
            }
          }}
        />
      )}
      {itemFormTarget && activeDictionary && (
        <DictionaryItemFormDialog
          key={itemFormTarget === 'create' ? 'create' : itemFormTarget.id}
          open
          item={itemFormTarget === 'create' ? undefined : itemFormTarget}
          nextSort={Math.max(0, ...items.map((item) => item.sort)) + 1}
          onOpenChange={(open) => !open && setItemFormTarget(null)}
          onSubmit={async (input) => {
            if (itemFormTarget === 'create')
              await createItem.mutateAsync({ dictionaryId: activeDictionary.id, input });
            else await updateItem.mutateAsync({ itemId: itemFormTarget.id, input });
          }}
        />
      )}
      <ConfirmDialog
        open={!!deleteDictionaryTarget}
        title={t('dictionaries.confirm.deleteDictionaryTitle')}
        description={t('dictionaries.confirm.deleteDictionaryDesc', { name: deleteDictionaryTarget?.name })}
        cancelText={t('dictionaries.actions.cancel')}
        confirmText={t('dictionaries.actions.confirmDelete')}
        onOpenChange={(open) => !open && setDeleteDictionaryTarget(null)}
        onConfirm={async () => {
          if (!deleteDictionaryTarget) return;
          await deleteDictionary.mutateAsync(deleteDictionaryTarget.id);
          setDeleteDictionaryTarget(null);
        }}
      />
      <ConfirmDialog
        open={!!deleteItemTarget}
        title={t('dictionaries.confirm.deleteItemTitle')}
        description={t('dictionaries.confirm.deleteItemDesc', { name: deleteItemTarget?.label })}
        cancelText={t('dictionaries.actions.cancel')}
        confirmText={t('dictionaries.actions.confirmDelete')}
        onOpenChange={(open) => !open && setDeleteItemTarget(null)}
        onConfirm={async () => {
          if (!deleteItemTarget) return;
          await deleteItem.mutateAsync(deleteItemTarget.id);
          setDeleteItemTarget(null);
        }}
      />
    </PageFrame>
  );
}
