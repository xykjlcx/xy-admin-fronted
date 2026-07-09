import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FilterButton, FilterSelect } from '@/components/pro/FilterSelect';
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

export function UsersToolbar({ variant, search, canCreate, onSearchChange, onCreate }: UsersToolbarProps) {
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
            onValueChange={(status) => onSearchChange({ status, page: 1 })}
          />
          <FilterButton
            data-role-filter-control="toggle"
            data-state={search.directOnly ? 'open' : 'closed'}
            type="button"
            aria-pressed={!!search.directOnly}
            disabled={!search.deptId}
            onClick={() => onSearchChange({ directOnly: !search.directOnly, page: 1 })}
          >
            {t('users.filters.directOnly')}
          </FilterButton>
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
