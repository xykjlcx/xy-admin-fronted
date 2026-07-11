import { Plus, Trash2 } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { SelectControl } from '@/components/ui/select';
import { FilterButton } from './FilterSelect';

export interface AdvancedFilterOption {
  value: string;
  label: ReactNode;
}

export interface AdvancedFilterOperator {
  value: string;
  label: ReactNode;
}

export interface AdvancedFilterField {
  value: string;
  label: ReactNode;
  input: 'text' | 'select';
  operators: AdvancedFilterOperator[];
  options?: AdvancedFilterOption[];
}

export interface AdvancedFilterCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface AdvancedFilterLabels {
  button: string;
  activeButton: string;
  title: string;
  add: string;
  clear: string;
  field: string;
  operator: string;
  value: string;
  valuePlaceholder: string;
  remove: string;
  empty: string;
}

export interface AdvancedFilterProps {
  fields: AdvancedFilterField[];
  value: AdvancedFilterCondition[];
  labels: AdvancedFilterLabels;
  className?: string;
  onChange: (value: AdvancedFilterCondition[]) => void;
}

function textLabel(label: ReactNode) {
  return typeof label === 'string' ? label : '';
}

function firstValue(field: AdvancedFilterField | undefined) {
  if (!field) return '';
  if (field.input === 'select') return field.options?.[0]?.value ?? '';
  return '';
}

function nextCondition(id: string, field: AdvancedFilterField | undefined): AdvancedFilterCondition {
  return {
    id,
    field: field?.value ?? '',
    operator: field?.operators[0]?.value ?? '',
    value: firstValue(field),
  };
}

export function AdvancedFilter({
  fields,
  value,
  labels,
  className,
  onChange,
}: AdvancedFilterProps) {
  const idSeed = useRef(0);
  const activeCount = value.filter((item) => item.value.trim()).length;
  const buttonText = activeCount > 0
    ? labels.activeButton.replace('{{count}}', String(activeCount))
    : labels.button;

  const updateCondition = (id: string, patch: Partial<AdvancedFilterCondition>) => {
    onChange(value.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addCondition = () => {
    let id = `filter-${idSeed.current}`;
    while (value.some((item) => item.id === id)) {
      idSeed.current += 1;
      id = `filter-${idSeed.current}`;
    }
    idSeed.current += 1;
    onChange([...value, nextCondition(id, fields[0])]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <FilterButton className={className}>
          {buttonText}
        </FilterButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(520px*var(--app-scale))]">
        <PopoverHeader className="mb-3 flex-row items-center justify-between">
          <PopoverTitle>{labels.title}</PopoverTitle>
          <div className="flex items-center gap-2">
            {value.length > 0 && (
              <Button type="button" variant="text" size="xs" onClick={() => onChange([])}>
                {labels.clear}
              </Button>
            )}
            <Button type="button" variant="outline" size="xs" onClick={addCondition}>
              <Plus data-icon="inline-start" />
              {labels.add}
            </Button>
          </div>
        </PopoverHeader>

        {value.length === 0 ? (
          <div className="rounded-8 border border-dashed border-(--field-border) px-3 py-6 text-center text-sm text-text-3">
            {labels.empty}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {value.map((condition) => {
              const field = fields.find((item) => item.value === condition.field) ?? fields[0];
              const operatorOptions = field?.operators ?? [];
              const valueOptions = field?.options ?? [];
              const selectedValueLabel = valueOptions.find((item) => item.value === condition.value)?.label;

              return (
                <div
                  key={condition.id}
                  role="group"
                  aria-label={textLabel(field?.label) || labels.field}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_auto] items-center gap-2"
                >
                  <SelectControl
                    value={condition.field}
                    size="sm"
                    aria-label={`${labels.field} ${textLabel(field?.label)}`}
                    options={fields.map((item) => ({ value: item.value, label: item.label }))}
                    onValueChange={(fieldValue) => {
                      const nextField = fields.find((item) => item.value === fieldValue);
                      updateCondition(condition.id, nextCondition(condition.id, nextField));
                    }}
                  />
                  <SelectControl
                    value={condition.operator}
                    size="sm"
                    aria-label={`${labels.operator} ${textLabel(operatorOptions.find((item) => item.value === condition.operator)?.label)}`}
                    options={operatorOptions.map((item) => ({ value: item.value, label: item.label }))}
                    onValueChange={(operator) => updateCondition(condition.id, { operator })}
                  />
                  {field?.input === 'select' ? (
                    <SelectControl
                      value={condition.value}
                      size="sm"
                      aria-label={[labels.value, textLabel(selectedValueLabel)].filter(Boolean).join(' ')}
                      options={valueOptions.map((item) => ({ value: item.value, label: item.label }))}
                      onValueChange={(nextValue) => updateCondition(condition.id, { value: nextValue })}
                    />
                  ) : (
                    <Input
                      inputSize="sm"
                      value={condition.value}
                      aria-label={labels.value}
                      placeholder={labels.valuePlaceholder}
                      onChange={(event) => updateCondition(condition.id, { value: event.currentTarget.value })}
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={labels.remove}
                    onClick={() => onChange(value.filter((item) => item.id !== condition.id))}
                  >
                    <Trash2 data-icon="inline-start" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
