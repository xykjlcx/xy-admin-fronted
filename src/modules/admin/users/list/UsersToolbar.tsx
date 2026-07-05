import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FilterSelect } from '@/components/pro/FilterSelect';
import { Button } from '@/components/ui/button';
import { statusOptions } from '../model';
import type { MembersVariant, UsersSearch } from '../types';
import type { UsersQueryParams } from '../api';

interface UsersToolbarProps {
  variant: MembersVariant;
  search: UsersSearch;
  canCreate: boolean;
  onSearchChange: (patch: Partial<UsersQueryParams>) => void;
  onCreate?: () => void;
}

const filterControlClassName = [
  'border-(--field-border) bg-(--field-bg) text-text-2 shadow-none',
  'hover:border-(--field-border-hover) hover:bg-(--field-bg) hover:text-text',
  'data-[state=open]:border-(--field-border-hover) data-[state=open]:bg-(--field-bg-focus) data-[state=open]:text-text',
  'disabled:border-(--field-border) disabled:bg-(--field-bg-disabled) disabled:text-text-3',
].join(' ');

export function UsersToolbar({
  variant,
  search,
  canCreate,
  onSearchChange,
  onCreate,
}: UsersToolbarProps) {
  const { t } = useTranslation('admin');
  const statusFilterOptions = statusOptions.map((item) => ({
    value: item.value,
    label: t(`users.status.${item.value}`),
  }));

  return (
    <div className="mb-4 flex items-center gap-3">
      {variant === 'members' && (
        <>
          <FilterSelect
            label={t('users.filters.accountStatus')}
            value={search.status === 'left' ? 'all' : search.status}
            options={statusFilterOptions}
            triggerClassName={filterControlClassName}
            onValueChange={(status) => onSearchChange({ status, page: 1 })}
          />
          <Button
            data-role-filter-control="toggle"
            data-state={search.directOnly ? 'open' : 'closed'}
            type="button"
            variant="ghost"
            size="sm"
            className={filterControlClassName}
            aria-pressed={!!search.directOnly}
            disabled={!search.deptId}
            onClick={() => onSearchChange({ directOnly: !search.directOnly, page: 1 })}
          >
            {t('users.filters.directOnly')}
          </Button>
        </>
      )}
      <div className="flex-1" />
      {variant === 'members' && canCreate && onCreate && (
        <Button type="button" size="sm" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          {t('users.actions.create')}
        </Button>
      )}
    </div>
  );
}
