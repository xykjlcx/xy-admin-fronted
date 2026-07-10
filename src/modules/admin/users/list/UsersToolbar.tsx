import { Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

const SEARCH_DEBOUNCE_MS = 250;

export function UsersToolbar({ variant, search, canCreate, onSearchChange, onCreate }: UsersToolbarProps) {
  const { t } = useTranslation('admin');
  // 关键字受控在本地：每次输入不直接打 URL，防抖 250ms 后才提交（消费它的最近公共父就是本组件）
  const [keyword, setKeyword] = useState(search.keyword ?? '');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // URL 关键字被外部改动（切 tab / 点部门重置）时同步回本地输入值：
  // 用「渲染期对比上一次外部值」而非 effect，避免 setState-in-effect 级联渲染
  const externalKeyword = search.keyword ?? '';
  const [prevExternalKeyword, setPrevExternalKeyword] = useState(externalKeyword);
  if (externalKeyword !== prevExternalKeyword) {
    setPrevExternalKeyword(externalKeyword);
    setKeyword(externalKeyword);
  }

  // 卸载时清掉未触发的防抖计时器
  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    [],
  );

  const submitKeyword = (value: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    onSearchChange({ keyword: value, page: 1 });
  };

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    // 清空立即提交，避免残留旧结果
    if (value === '') {
      onSearchChange({ keyword: '', page: 1 });
      return;
    }
    debounceTimer.current = setTimeout(() => onSearchChange({ keyword: value, page: 1 }), SEARCH_DEBOUNCE_MS);
  };

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
        value={keyword}
        containerClassName="w-[calc(240px*var(--app-scale))]"
        onChange={(event) => handleKeywordChange(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submitKeyword(event.currentTarget.value);
        }}
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
