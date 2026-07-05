import { isValidElement, type JSX, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TreeNode {
  id: string;
  label: ReactNode;
  depth: number;
  meta?: ReactNode;
}

export interface TreeProps {
  nodes: TreeNode[];
  selectedId?: string;
  onSelect: (id: string) => void;
  ariaLabel: string;
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
  const meta = textFromNode(node.meta);
  return meta ? `${label} ${meta}` : label;
}

export function Tree({ nodes, selectedId, onSelect, ariaLabel }: TreeProps): JSX.Element {
  return (
    <div
      role="tree"
      aria-label={ariaLabel}
      className="grid gap-1"
    >
      {nodes.map((node) => {
        const selected = node.id === selectedId;
        const itemAriaLabel = treeItemAriaLabel(node);

        return (
          <button
            key={node.id}
            type="button"
            role="treeitem"
            aria-level={node.depth + 1}
            aria-label={itemAriaLabel}
            aria-selected={selected}
            className={cn(
              'flex min-h-[calc(36px*var(--app-scale))] w-full items-center gap-2 rounded-8 pr-3 text-left text-sm outline-none',
              selected
                ? 'bg-(--side-list-item-bg-active) font-semibold text-(--side-list-item-fg-active) hover:bg-(--side-list-item-bg-active)'
                : 'text-text-2 hover:bg-(--side-list-item-bg-hover)',
            )}
            style={{ paddingLeft: `calc(${baseIndent + node.depth * indentStep}px * var(--app-scale))` }}
            onClick={() => onSelect(node.id)}
          >
            <span className="min-w-0 flex-1 truncate">{node.label}</span>
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
        );
      })}
    </div>
  );
}
