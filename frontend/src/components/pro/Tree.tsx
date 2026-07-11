import { isValidElement, type JSX, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TreeNode {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  depth: number;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  expandable?: boolean;
  expanded?: boolean;
  toggleLabel?: string;
  hidden?: boolean;
}
export interface TreeProps {
  nodes: TreeNode[];
  variant?: 'default' | 'management';
  selectedId?: string;
  onSelect: (id: string) => void;
  onToggle?: (id: string) => void;
  ariaLabel: string;
  empty?: ReactNode;
}

const indentStep = 18;
const baseIndent = 12;

function textFromNode(node: ReactNode): string | undefined {
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') return String(node);
  if (Array.isArray(node)) {
    const parts = node.map(textFromNode).filter((part): part is string => !!part);
    return parts.length > 0 ? parts.join('') : undefined;
  }
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children);
  return undefined;
}

function treeItemAriaLabel(node: TreeNode): string | undefined {
  const label = textFromNode(node.label);
  if (!label) return undefined;
  const description = textFromNode(node.description);
  const meta = textFromNode(node.meta);
  return [label, description, meta].filter(Boolean).join(' ');
}

export function Tree({
  nodes,
  variant = 'default',
  selectedId,
  onSelect,
  onToggle,
  ariaLabel,
  empty,
}: TreeProps): JSX.Element {
  if (nodes.length === 0) {
    return <div data-slot="tree-empty" className="flex min-h-64 items-center justify-center text-sm text-text-3">{empty}</div>;
  }

  return (
    <div
      role="tree"
      aria-label={ariaLabel}
      data-variant={variant}
      className={cn(
        'grid',
        variant === 'default' && 'gap-1',
        variant === 'management' &&
          'overflow-hidden rounded-10 border border-(--table-border) bg-(--table-bg)',
      )}
    >
      {nodes.map((node, index) => {
        const selected = node.id === selectedId;
        const itemAriaLabel = treeItemAriaLabel(node);

        return (
          <div
            key={node.id}
            data-tree-row
            data-collapsed-hidden={node.hidden || undefined}
            className={cn(
              'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
              node.hidden ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                data-slot="tree-row-surface"
                aria-hidden={node.hidden || undefined}
                inert={node.hidden || undefined}
                className={cn(
                  'group/tree-row flex items-center px-1',
                  variant === 'default' && 'min-h-[calc(44px*var(--app-scale))] rounded-8',
                  variant === 'management' &&
                    'min-h-[calc(54px*var(--app-scale))]',
                  variant === 'management' && index < nodes.length - 1 &&
                    'border-b border-(--table-row-border)',
                  selected
                    ? 'bg-(--side-list-item-bg-active)'
                    : 'hover:bg-(--side-list-item-bg-hover)',
                  node.hidden && 'pointer-events-none',
                )}
              >
                {node.expandable ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={node.toggleLabel}
                    aria-expanded={node.expanded}
                    onClick={() => onToggle?.(node.id)}
                  >
                    <ChevronDown
                      data-icon="inline"
                      className={cn(
                        'transition-transform duration-200 motion-reduce:transition-none',
                        !node.expanded && '-rotate-90',
                      )}
                    />
                  </Button>
                ) : (
                  <span className="size-[calc(24px*var(--app-scale))] shrink-0" aria-hidden="true" />
                )}

                <button
                  type="button"
                  role="treeitem"
                  aria-level={node.depth + 1}
                  aria-label={itemAriaLabel}
                  aria-selected={selected}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2 rounded-8 pr-2 text-left text-sm outline-none',
                    variant === 'default' && 'min-h-[calc(36px*var(--app-scale))]',
                    variant === 'management' && 'min-h-[calc(46px*var(--app-scale))]',
                    selected
                      ? 'font-semibold text-(--side-list-item-fg-active)'
                      : 'text-text-2',
                  )}
                  style={{ paddingLeft: `calc(${baseIndent + node.depth * indentStep}px * var(--app-scale))` }}
                  onClick={() => onSelect(node.id)}
                >
                  {node.leading && (
                    <span
                      data-slot="tree-leading"
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-8 bg-(--pro-panel-bg)',
                        selected ? 'text-(--nav-item-fg-current)' : 'text-text-2',
                      )}
                    >
                      {node.leading}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{node.label}</span>
                    {node.description ? (
                      <span
                        data-slot="tree-description"
                        className={cn(
                          'mt-0.5 block truncate text-xs font-normal text-text-3',
                          selected && 'text-(--side-list-item-meta-fg-active)',
                        )}
                      >
                        {node.description}
                      </span>
                    ) : null}
                  </span>
                  {node.meta && (
                    <span
                      className={cn(
                        'shrink-0 text-xs text-text-3',
                        selected && 'text-(--side-list-item-meta-fg-active)',
                      )}
                    >
                      {node.meta}
                    </span>
                  )}
                </button>

                {node.trailing && (
                  <span data-slot="tree-trailing" className="flex shrink-0 items-center gap-1.5 pr-2">
                    {node.trailing}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
