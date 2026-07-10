import { Fragment, type CSSProperties } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface DataTableRowAction {
  id: string;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}

interface DataTableRowActionsProps {
  actions: DataTableRowAction[];
  overflowLabel: string;
}

const inlineActionStyle: CSSProperties = { paddingInline: 0, borderWidth: 0 };

export function DataTableRowActions(_props: DataTableRowActionsProps) {
  const { actions, overflowLabel } = _props;

  if (actions.length === 0) return null;

  const inlineActions = actions.length <= 2 ? actions : actions.slice(0, 1);
  const overflowActions = actions.length <= 2 ? [] : actions.slice(1);

  return (
    <div data-slot="data-table-row-actions" className="flex items-center gap-2">
      {inlineActions.map((action, index) => (
        <Fragment key={action.id}>
          {index > 0 && (
            <span
              data-slot="data-table-row-action-separator"
              aria-hidden="true"
              className="h-3 w-px shrink-0 bg-(--table-row-border)"
            />
          )}
          <Button
            type="button"
            variant="link"
            size="xs"
            className={action.tone === 'danger' ? 'text-(--menu-item-fg-danger)' : undefined}
            style={inlineActionStyle}
            disabled={action.disabled}
            onClick={action.onSelect}
          >
            {action.label}
          </Button>
        </Fragment>
      ))}

      {overflowActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon-xs" aria-label={overflowLabel}>
              <MoreHorizontal data-icon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {overflowActions.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  disabled={action.disabled}
                  variant={action.tone === 'danger' ? 'destructive' : 'default'}
                  onSelect={action.onSelect}
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
