import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AdvancedFilter, type AdvancedFilterField } from '@/components/pro/AdvancedFilter';
import { FilterButton, FilterSelect } from '@/components/pro/FilterSelect';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
import { parseUserFilters, sanitizeUserFilters, statusOptions, stringifyUserFilters } from '../model';
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
  const statusFilterOptions = useMemo(
    () => statusOptions.map((item) => ({
      value: item.value,
      label: t(`users.status.${item.value}`),
    })),
    [t],
  );
  const advancedFilters = useMemo(() => parseUserFilters(search.filters), [search.filters]);
  const advancedFields = useMemo<AdvancedFilterField[]>(() => {
    const textOperators = [
      { value: 'contains', label: t('users.filters.operators.contains') },
      { value: 'eq', label: t('users.filters.operators.eq') },
    ];
    const fields: AdvancedFilterField[] = [
      {
        value: 'name',
        label: t('users.filters.fields.name'),
        input: 'text',
        operators: textOperators,
      },
      {
        value: 'phone',
        label: t('users.filters.fields.phone'),
        input: 'text',
        operators: textOperators,
      },
      {
        value: 'email',
        label: t('users.filters.fields.email'),
        input: 'text',
        operators: textOperators,
      },
      {
        value: 'role',
        label: t('users.filters.fields.role'),
        input: 'text',
        operators: textOperators,
      },
    ];

    if (variant === 'members') {
      fields.push({
        value: 'status',
        label: t('users.filters.fields.status'),
        input: 'select',
        operators: [{ value: 'eq', label: t('users.filters.operators.eq') }],
        options: statusFilterOptions
          .filter((item) => item.value !== 'all')
          .map((item) => ({ value: item.value, label: item.label })),
      });
    }

    return fields;
  }, [statusFilterOptions, t, variant]);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <SearchField
        aria-label={t('users.searchPlaceholder')}
        placeholder={t('users.searchPlaceholder')}
        value={search.keyword ?? ''}
        containerClassName="w-[calc(240px*var(--app-scale))]"
        onChange={(event) => onSearchChange({ keyword: event.currentTarget.value, page: 1 })}
      />
      <AdvancedFilter
        fields={advancedFields}
        value={advancedFilters}
        labels={{
          button: t('users.filters.advanced'),
          activeButton: t('users.filters.advancedActive'),
          title: t('users.filters.advanced'),
          add: t('users.filters.addCondition'),
          clear: t('users.filters.clearConditions'),
          field: t('users.filters.field'),
          operator: t('users.filters.operator'),
          value: t('users.filters.value'),
          valuePlaceholder: t('users.filters.valuePlaceholder'),
          remove: t('users.filters.removeCondition'),
          empty: t('users.filters.emptyConditions'),
        }}
        onChange={(next) => onSearchChange({ filters: stringifyUserFilters(sanitizeUserFilters(next)), page: 1 })}
      />
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
