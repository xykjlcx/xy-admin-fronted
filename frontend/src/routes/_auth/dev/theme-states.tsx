import { createFileRoute, notFound } from '@tanstack/react-router';
import { featuresConfig } from '@/config';
import type { ColumnDef, OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ACCENTS, type AccentKey, type Zoom } from '@/lib/appearance-dom';
import { useAppearance } from '@/stores/appearance';
import { NativeSelect } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { dialogTitleClassName } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SelectControl } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { ProgressBar } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { AnimatedTabs, type AnimatedTabItem } from '@/components/pro/AnimatedTabs';
import { DataTable } from '@/components/pro/DataTable';
import { DataToolbar, DataToolbarGroup, SummaryStrip } from '@/components/pro/DataToolbar';
import { QueryState } from '@/components/pro/QueryState';
import { DataTableRowActions, type DataTableRowAction } from '@/components/pro/DataTableRowActions';
import { Tree, type TreeNode } from '@/components/pro/Tree';
import { TableShell, TableShellHeader, TableShellRow } from '@/components/pro/TableShell';
import { SideCardList, SideList, type SideListItem } from '@/components/pro/SideList';
import {
  PagePane,
  PagePaneBody,
  PagePaneFooter,
  PagePaneHeader,
  PageThreePane,
} from '@/components/pro/PageScaffold';
import { Pagination } from '@/components/pro/Pagination';
import { SearchField } from '@/components/pro/SearchField';
import { FileDropzone } from '@/components/pro/FileDropzone';

export const Route = createFileRoute('/_auth/dev/theme-states')({
  // dev 组件状态矩阵：仅开发态 / 视觉验收（VITE_ENABLE_VISUAL_DEBUG）可见，生产环境视同不存在。
  // 无此门则任何登录用户直连 URL 即可访问内部组件画廊。
  beforeLoad: () => {
    if (!featuresConfig.isDev && !featuresConfig.enableVisualDebug) throw notFound();
  },
  component: ThemeStatesRoute,
});

const flavors = ['feishu', 'claude', 'shadcn', 'sera'] as const;
const modes = ['light', 'dark'] as const;
const scales = ['sm', 'md', 'lg'] as const satisfies readonly Zoom[];
const flavorLabelKeys: Record<(typeof flavors)[number], string> = {
  feishu: 'shell.appearanceDrawer.flavorFeishu',
  claude: 'shell.appearanceDrawer.flavorClaude',
  shadcn: 'shell.appearanceDrawer.flavorShadcn',
  sera: 'shell.appearanceDrawer.flavorSera',
};
const modeLabelKeys: Record<(typeof modes)[number], string> = {
  light: 'dev.themeStates.light',
  dark: 'dev.themeStates.dark',
};
const scaleLabelKeys: Record<(typeof scales)[number], string> = {
  sm: 'shell.appearanceDrawer.zoomSm',
  md: 'shell.appearanceDrawer.zoomMd',
  lg: 'shell.appearanceDrawer.zoomLg',
};
const buttonVariantsForThemeStates = [
  'default',
  'primary',
  'secondary',
  'outline',
  'dashed',
  'text',
  'ghost',
  'link',
  'danger',
  'destructive',
  'danger-ghost',
] as const;
const buttonVariantLabelKeys: Record<(typeof buttonVariantsForThemeStates)[number], string> = {
  default: 'dev.themeStates.buttonDefault',
  primary: 'dev.themeStates.buttonPrimary',
  secondary: 'dev.themeStates.buttonSecondary',
  outline: 'dev.themeStates.buttonOutline',
  dashed: 'dev.themeStates.buttonDashed',
  text: 'dev.themeStates.buttonText',
  ghost: 'dev.themeStates.buttonGhost',
  link: 'dev.themeStates.buttonLink',
  danger: 'dev.themeStates.buttonDanger',
  destructive: 'dev.themeStates.buttonDestructive',
  'danger-ghost': 'dev.themeStates.buttonDangerGhost',
};
const badgeVariantsForThemeStates = [
  'neutral',
  'primary',
  'success',
  'warning',
  'danger',
  'purple',
  'teal',
] as const;
const badgeVariantLabelKeys: Record<(typeof badgeVariantsForThemeStates)[number], string> = {
  neutral: 'dev.themeStates.badgeNeutral',
  primary: 'dev.themeStates.badgePrimary',
  success: 'dev.themeStates.badgeSuccess',
  warning: 'dev.themeStates.badgeWarning',
  danger: 'dev.themeStates.badgeDanger',
  purple: 'dev.themeStates.badgePurple',
  teal: 'dev.themeStates.badgeTeal',
};
const step7GridTemplate = '1.2fr 1fr calc(120px * var(--app-scale))';
const tableTokenRows = ['selected', 'normal', 'expanded'] as const;
const shellTokenItems = ['members', 'roles', 'menus'] as const;

interface DataTableThemeRow {
  id: string;
  nameKey: string;
  statusKey: string;
}

interface TreeThemeNode {
  id: string;
  labelKey: string;
  depth: number;
  meta?: string;
}

const dataTableRows: DataTableThemeRow[] = [
  {
    id: 'selected',
    nameKey: 'dev.themeStates.dataTableSelected',
    statusKey: 'dev.themeStates.tableStatusEnabled',
  },
  {
    id: 'normal',
    nameKey: 'dev.themeStates.dataTableNormal',
    statusKey: 'dev.themeStates.tableStatusEnabled',
  },
  {
    id: 'disabled',
    nameKey: 'dev.themeStates.dataTableDisabled',
    statusKey: 'dev.themeStates.fieldInactive',
  },
];
const dataTableSingleRows: DataTableThemeRow[] = [
  {
    id: 'single',
    nameKey: 'dev.themeStates.dataTableSelected',
    statusKey: 'dev.themeStates.tableStatusEnabled',
  },
];
const dataTablePartialRowSelection: RowSelectionState = { selected: true };
const dataTableAllRowSelection: RowSelectionState = { selected: true, normal: true, disabled: true };
const dataTableSingleRowSelection: RowSelectionState = { single: true };
const dataTableSelectionStates = [
  {
    id: 'partial',
    rows: dataTableRows,
    rowSelection: dataTablePartialRowSelection,
  },
  {
    id: 'all',
    rows: dataTableRows,
    rowSelection: dataTableAllRowSelection,
  },
  {
    id: 'single',
    rows: dataTableSingleRows,
    rowSelection: dataTableSingleRowSelection,
  },
] satisfies {
  id: 'partial' | 'all' | 'single';
  rows: DataTableThemeRow[];
  rowSelection: RowSelectionState;
}[];
const noopDataTableRowSelectionChange: OnChangeFn<RowSelectionState> = () => undefined;
const treeThemeNodes: TreeThemeNode[] = [
  { id: 'all', labelKey: 'dev.themeStates.treeNodes.all', depth: 0, meta: '42' },
  { id: 'rd', labelKey: 'dev.themeStates.treeNodes.rd', depth: 1, meta: '18' },
  { id: 'ops', labelKey: 'dev.themeStates.treeNodes.ops', depth: 2, meta: '8' },
];

function ThemeStatesRoute() {
  const { t } = useTranslation();
  const { flavor, mode, accent, customAccent, zoom, set, setFlavor } = useAppearance();
  const [animatedTabsValue, setAnimatedTabsValue] = useState<'members' | 'logs'>('members');
  const [sideListActive, setSideListActive] = useState<(typeof shellTokenItems)[number]>('members');
  const [treeExpanded, setTreeExpanded] = useState(true);
  const fieldSelectOptions = [
    { value: '', label: t('dev.themeStates.fieldSelectPlaceholder') },
    { value: 'rd', label: t('dev.themeStates.fieldResearch') },
    { value: 'ops', label: t('dev.themeStates.fieldOperations') },
  ];
  const animatedTabItems: AnimatedTabItem<'members' | 'logs'>[] = [
    { value: 'members', label: t('dev.themeStates.animatedTabMembers') },
    { value: 'logs', label: t('dev.themeStates.animatedTabLogs') },
  ];
  const sideListItems: SideListItem[] = shellTokenItems.map((id) => ({
    id,
    label: t(`dev.themeStates.sideList.${id}`),
    meta: id === 'members' ? '14' : undefined,
  }));
  const treeNodes: TreeNode[] = treeThemeNodes.map((node) => ({
    id: node.id,
    label: t(node.labelKey),
    description: node.id,
    depth: node.depth,
    meta: node.meta,
    expandable: node.id === 'all',
    expanded: treeExpanded,
    toggleLabel: t('dev.themeStates.treeAriaLabel'),
    hidden: !treeExpanded && node.id !== 'all',
    leading: <CheckIcon data-icon="inline" />,
    trailing: <Badge variant={node.id === 'rd' ? 'primary' : 'neutral'}>{node.id}</Badge>,
  }));
  const dataTableRowActions: DataTableRowAction[] = [
    {
      id: 'view',
      label: t('dev.themeStates.tableActionView'),
      onSelect: () => undefined,
    },
    {
      id: 'edit',
      label: t('dev.themeStates.tableActionEdit'),
      onSelect: () => undefined,
    },
    {
      id: 'delete',
      label: t('dev.themeStates.tableActionDelete'),
      onSelect: () => undefined,
      tone: 'danger',
    },
  ];
  const dataTableColumns: ColumnDef<DataTableThemeRow>[] = [
    {
      id: 'name',
      header: t('dev.themeStates.tableName'),
      size: 220,
      minSize: 180,
      enableSorting: false,
      cell: ({ row }) => t(row.original.nameKey),
    },
    {
      id: 'status',
      header: t('dev.themeStates.tableStatus'),
      size: 160,
      minSize: 140,
      enableSorting: false,
      cell: ({ row }) => t(row.original.statusKey),
    },
    {
      id: 'action',
      header: t('dev.themeStates.tableAction'),
      size: 112,
      minSize: 112,
      maxSize: 112,
      enablePinning: true,
      meta: { headerAlign: 'start', cellAlign: 'start', pin: 'right', stopRowClick: true },
      enableSorting: false,
      cell: () => (
        <DataTableRowActions
          actions={dataTableRowActions}
          overflowLabel={t('dev.themeStates.tableActionMore')}
        />
      ),
    },
  ];

  return (
    <main className="flex min-h-full flex-col gap-4 bg-page p-6 text-text">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-normal text-text-3">
          {t('dev.themeStates.eyebrow')}
        </p>
        <h1 className="ui-page-title text-xl font-semibold text-text">{t('dev.themeStates.title')}</h1>
        <p className="max-w-[720px] text-sm text-text-2">{t('dev.themeStates.description')}</p>
      </header>

      <section className="grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-card-sm md:grid-cols-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          {t('shell.appearanceDrawer.flavor')}
          <NativeSelect
            data-matrix="flavor"
            value={flavor}
            onChange={(event) => setFlavor(event.currentTarget.value as typeof flavor)}
          >
            {flavors.map((item) => (
              <option key={item} value={item}>
                {t(flavorLabelKeys[item])}
              </option>
            ))}
          </NativeSelect>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          {t('dev.themeStates.mode')}
          <NativeSelect
            data-matrix="mode"
            value={mode}
            onChange={(event) => set({ mode: event.currentTarget.value as typeof mode })}
          >
            {modes.map((item) => (
              <option key={item} value={item}>
                {t(modeLabelKeys[item])}
              </option>
            ))}
          </NativeSelect>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          {t('dev.themeStates.scale')}
          <NativeSelect
            data-matrix="scale"
            value={zoom}
            onChange={(event) => set({ zoom: event.currentTarget.value as typeof zoom })}
          >
            {scales.map((item) => (
              <option key={item} value={item}>
                {t(scaleLabelKeys[item])}
              </option>
            ))}
          </NativeSelect>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          {t('shell.appearanceDrawer.accent')}
          <NativeSelect
            value={accent}
            onChange={(event) => set({ accent: event.currentTarget.value as AccentKey })}
          >
            {ACCENTS.map((item) => (
              <option key={item.key} value={item.key}>
                {t(`shell.appearanceDrawer.${item.labelKey}`)}
              </option>
            ))}
            <option value="custom">{t('shell.appearanceDrawer.accentCustom')}</option>
          </NativeSelect>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
          {t('shell.appearanceDrawer.accentCustom')}
          <Input
            value={customAccent}
            onChange={(event) => set({ accent: 'custom', customAccent: event.currentTarget.value })}
            placeholder={t('dev.themeStates.customAccentPlaceholder')}
          />
        </label>
      </section>

      <section className="grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-card-sm md:grid-cols-3">
        <div className="rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.primaryAction')}</p>
          <div className="mt-3 flex gap-2">
            <Button>{t('dev.themeStates.primary')}</Button>
            <Button variant="outline">{t('dev.themeStates.outline')}</Button>
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-text">{t('dev.themeStates.currentContract')}</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-text-2">
            <dt>flavor</dt>
            <dd className="font-medium text-text">{flavor}</dd>
            <dt>mode</dt>
            <dd className="font-medium text-text">{mode}</dd>
            <dt>accent</dt>
            <dd className="font-medium text-text">{accent}</dd>
          </dl>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-card-sm">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">{t('dev.themeStates.buttonMatrix')}</h2>
          <p className="text-sm text-text-2">{t('dev.themeStates.buttonMatrixDesc')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {buttonVariantsForThemeStates.map((variant) => (
            <Button key={variant} variant={variant}>
              {t(buttonVariantLabelKeys[variant])}
            </Button>
          ))}
          <Button loading>{t('dev.themeStates.buttonLoading')}</Button>
          <Button disabled>{t('dev.themeStates.buttonDisabled')}</Button>
          <Button variant="ghost" size="icon" aria-label={t('dev.themeStates.buttonIcon')}>
            <span data-icon="theme-states" className="font-semibold">
              i
            </span>
          </Button>
        </div>
      </section>

      <section
        data-testid="badgeMatrix"
        className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
      >
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">{t('dev.themeStates.badgeMatrix')}</h2>
          <p className="text-sm text-text-2">{t('dev.themeStates.badgeMatrixDesc')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-border bg-surface-2 p-4">
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.badgeNoDot')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {badgeVariantsForThemeStates.map((variant) => (
                <Badge key={variant} variant={variant}>
                  {t(badgeVariantLabelKeys[variant])}
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-surface-2 p-4">
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.badgeWithDot')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {badgeVariantsForThemeStates.map((variant) => (
                <Badge key={variant} variant={variant} dot dotTestId={`badge-dot-${variant}`}>
                  {t(badgeVariantLabelKeys[variant])}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        data-testid="avatarMatrix"
        className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
      >
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">{t('dev.themeStates.avatarMatrix')}</h2>
          <p className="text-sm text-text-2">{t('dev.themeStates.avatarMatrixDesc')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-border bg-surface-2 p-4">
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.avatarSingle')}</p>
            <Avatar size="lg">
              <AvatarFallback>{t('dev.themeStates.avatarInitials')}</AvatarFallback>
              <AvatarBadge aria-label={t('dev.themeStates.avatarStatus')} />
            </Avatar>
          </div>
          <div className="rounded-md border border-border bg-surface-2 p-4">
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.avatarGroup')}</p>
            <AvatarGroup>
              <Avatar>
                <AvatarFallback>{t('dev.themeStates.avatarInitials')}</AvatarFallback>
              </Avatar>
              <Avatar size="sm">
                <AvatarFallback>{t('dev.themeStates.avatarSecondaryInitials')}</AvatarFallback>
              </Avatar>
              <AvatarGroupCount>{t('dev.themeStates.avatarCount')}</AvatarGroupCount>
            </AvatarGroup>
          </div>
        </div>
      </section>

      <section
        data-testid="cardMatrix"
        className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
      >
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">{t('dev.themeStates.cardMatrix')}</h2>
          <p className="text-sm text-text-2">{t('dev.themeStates.cardMatrixDesc')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card data-testid="card-full">
            <CardHeader>
              <CardTitle>{t('dev.themeStates.cardTitle')}</CardTitle>
              <CardDescription>{t('dev.themeStates.cardDescription')}</CardDescription>
              <CardAction>
                <Badge variant="primary">{t('dev.themeStates.cardActionBadge')}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-2">{t('dev.themeStates.cardContent')}</p>
            </CardContent>
            <CardFooter className="border-t">
              <span className="text-sm text-text-3">{t('dev.themeStates.cardFooter')}</span>
            </CardFooter>
          </Card>
        </div>
      </section>

      <section
        data-testid="dialogTitleMatrix"
        className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
      >
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">{t('dev.themeStates.dialogMatrix')}</h2>
          <p className="text-sm text-text-2">{t('dev.themeStates.dialogMatrixDesc')}</p>
        </div>
        {/* Dialog 组件必须 portal + open 才渲染 DialogTitle（radix useDialogContext 无 provider 会抛错），
            portal 到 body 又会脱离本 section 打断矩阵截图——照 step8 弹层块先例静态内嵌 raw 预览。
            dialog-title 元素的排印类 import dialog.tsx 导出的 dialogTitleClassName 单一真相源，
            与真实 DialogTitle 共用同一常量（防漂移），作 title token 束的可截图载体。 */}
        <div className="grid gap-4 md:grid-cols-2">
          <div
            data-slot="dialog-content"
            className="grid gap-4 rounded-14 border border-(--overlay-border) bg-(--overlay-bg) p-6 text-(--overlay-fg) shadow-(--overlay-shadow-modal)"
          >
            <div className="flex flex-col gap-2">
              <div data-slot="dialog-title" className={dialogTitleClassName}>
                {t('dev.themeStates.dialogTitle')}
              </div>
              <p data-slot="dialog-description" className="text-sm text-text-2">
                {t('dev.themeStates.dialogDescription')}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline">{t('dev.themeStates.dialogCancel')}</Button>
              <Button variant="danger">{t('dev.themeStates.dialogConfirm')}</Button>
            </div>
          </div>
        </div>
      </section>

      <section
        data-testid="labelPeerMatrix"
        className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
      >
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">{t('dev.themeStates.labelMatrix')}</h2>
          <p className="text-sm text-text-2">{t('dev.themeStates.labelMatrixDesc')}</p>
        </div>
        {/* peer 豁免的验证载体：peer 元素（checkbox/radio-group-item/switch）须带 .peer 类且是 Label 的前置兄弟，
            豁免规则 .peer[data-slot=checkbox] ~ label 才能命中。switch 根 / RadioGroupItem 自带 peer；checkbox 外层 span
            的 peer 在内层 input 上，故显式补 className="peer" 让外层（带 data-slot=checkbox）成为 peer 锚点。
            radio：RadioGroupItem 自带 peer + data-slot=radio-group-item，与 Label 同为 RadioGroup 直接子级（前置兄弟）才命中豁免。 */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-4">
            <p className="text-sm font-medium text-text">{t('dev.themeStates.labelStandalone')}</p>
            <Label htmlFor="theme-label-standalone">{t('dev.themeStates.labelStandalone')}</Label>
            <Input id="theme-label-standalone" placeholder={t('dev.themeStates.focusPlaceholder')} />
          </div>
          <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-4">
            <p className="text-sm font-medium text-text">{t('dev.themeStates.labelCheckbox')}</p>
            <div className="flex items-center gap-2">
              <Checkbox className="peer" aria-label={t('dev.themeStates.labelCheckbox')} checked readOnly />
              <Label>{t('dev.themeStates.labelCheckbox')}</Label>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-4">
            <p className="text-sm font-medium text-text">{t('dev.themeStates.labelRadio')}</p>
            <RadioGroup defaultValue="on" className="flex items-center gap-2">
              <RadioGroupItem value="on" aria-label={t('dev.themeStates.labelRadio')} />
              <Label>{t('dev.themeStates.labelRadio')}</Label>
            </RadioGroup>
          </div>
          <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-4">
            <p className="text-sm font-medium text-text">{t('dev.themeStates.labelSwitch')}</p>
            <div className="flex items-center gap-2">
              <Switch aria-label={t('dev.themeStates.labelSwitch')} defaultChecked />
              <Label>{t('dev.themeStates.labelSwitch')}</Label>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-card-sm">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">{t('dev.themeStates.fieldMatrix')}</h2>
          <p className="text-sm text-text-2">{t('dev.themeStates.fieldMatrixDesc')}</p>
        </div>
        <FieldGroup className="grid gap-4 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="theme-field-default">{t('dev.themeStates.fieldDefault')}</FieldLabel>
            <Input id="theme-field-default" placeholder={t('dev.themeStates.focusPlaceholder')} />
            <FieldDescription>{t('dev.themeStates.fieldDefaultDesc')}</FieldDescription>
          </Field>

          <Field data-invalid>
            <FieldLabel htmlFor="theme-field-invalid">{t('dev.themeStates.fieldInvalid')}</FieldLabel>
            <Input id="theme-field-invalid" aria-invalid defaultValue="abc" />
            <FieldError>{t('dev.themeStates.fieldInvalidDesc')}</FieldError>
          </Field>

          <Field data-disabled>
            <FieldLabel htmlFor="theme-field-disabled">{t('dev.themeStates.fieldDisabled')}</FieldLabel>
            <Input
              id="theme-field-disabled"
              disabled
              defaultValue={t('dev.themeStates.fieldDisabledValue')}
              readOnly
            />
            <FieldDescription>{t('dev.themeStates.fieldDisabledDesc')}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="theme-field-readonly">{t('dev.themeStates.fieldReadonly')}</FieldLabel>
            <Input
              id="theme-field-readonly"
              readOnly
              defaultValue={t('dev.themeStates.fieldReadonlyValue')}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="theme-field-addon">{t('dev.themeStates.fieldAddon')}</FieldLabel>
            <Input id="theme-field-addon" addonBefore="https://" defaultValue="acme.com" />
          </Field>

          <Field>
            <FieldLabel htmlFor="theme-field-native-select">
              {t('dev.themeStates.fieldNativeSelect')}
            </FieldLabel>
            <NativeSelect id="theme-field-native-select" defaultValue="active">
              <option value="active">{t('dev.themeStates.fieldActive')}</option>
              <option value="disabled">{t('dev.themeStates.fieldInactive')}</option>
            </NativeSelect>
          </Field>

          <Field>
            <FieldLabel>{t('dev.themeStates.fieldSelect')}</FieldLabel>
            <SelectControl
              value=""
              options={fieldSelectOptions}
              placeholder={t('dev.themeStates.fieldSelectPlaceholder')}
              onValueChange={() => undefined}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="theme-field-search">{t('dev.themeStates.fieldSearch')}</FieldLabel>
            <SearchField id="theme-field-search" placeholder={t('dev.themeStates.fieldSearchPlaceholder')} />
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="theme-field-textarea">{t('dev.themeStates.fieldTextarea')}</FieldLabel>
            <Textarea id="theme-field-textarea" placeholder={t('dev.themeStates.fieldTextareaPlaceholder')} />
          </Field>
        </FieldGroup>
      </section>

      <section
        data-testid="step6Matrix"
        className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
      >
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">{t('dev.themeStates.step6Matrix')}</h2>
          <p className="text-sm text-text-2">{t('dev.themeStates.step6MatrixDesc')}</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="rounded-md border border-border bg-surface-2 p-4">
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.tabsMatrix')}</p>
            <div className="grid gap-5 md:grid-cols-2">
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">{t('dev.themeStates.tabOverview')}</TabsTrigger>
                  <TabsTrigger value="metrics">{t('dev.themeStates.tabMetrics')}</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="pt-3 text-sm text-text-2">
                  {t('dev.themeStates.tabOverviewContent')}
                </TabsContent>
              </Tabs>

              <Tabs defaultValue="metrics">
                <TabsList variant="line">
                  <TabsTrigger value="overview">{t('dev.themeStates.tabOverview')}</TabsTrigger>
                  <TabsTrigger value="metrics">{t('dev.themeStates.tabMetrics')}</TabsTrigger>
                </TabsList>
                <TabsContent value="metrics" className="pt-3 text-sm text-text-2">
                  {t('dev.themeStates.tabMetricsContent')}
                </TabsContent>
              </Tabs>

              <div className="md:col-span-2">
                <AnimatedTabs
                  value={animatedTabsValue}
                  items={animatedTabItems}
                  onValueChange={setAnimatedTabsValue}
                  ariaLabel={t('dev.themeStates.animatedTabsAria')}
                  variant="content"
                />
                <p className="pt-3 text-sm text-text-2">
                  {animatedTabsValue === 'members'
                    ? t('dev.themeStates.animatedTabMembersContent')
                    : t('dev.themeStates.animatedTabLogsContent')}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface-2 p-4">
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.choiceMatrix')}</p>
            <div className="grid gap-3 text-sm text-text-2">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox aria-label={t('dev.themeStates.choiceChecked')} checked readOnly />
                <span>{t('dev.themeStates.choiceChecked')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox aria-label={t('dev.themeStates.choiceIndeterminate')} indeterminate readOnly />
                <span>{t('dev.themeStates.choiceIndeterminate')}</span>
              </label>
              <label className="flex cursor-not-allowed items-center gap-2">
                <Checkbox aria-label={t('dev.themeStates.choiceDisabled')} disabled />
                <span>{t('dev.themeStates.choiceDisabled')}</span>
              </label>
              <RadioGroup defaultValue="invalid" className="grid grid-cols-2 gap-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="enabled" aria-label={t('dev.themeStates.radioEnabled')} />
                  <span>{t('dev.themeStates.radioEnabled')}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem
                    value="invalid"
                    aria-label={t('dev.themeStates.radioInvalid')}
                    aria-invalid
                  />
                  <span>{t('dev.themeStates.radioInvalid')}</span>
                </label>
              </RadioGroup>
              <label className="flex cursor-pointer items-center gap-2">
                <Switch aria-label={t('dev.themeStates.switchEnabled')} defaultChecked />
                <span>{t('dev.themeStates.switchEnabled')}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Switch aria-label={t('dev.themeStates.switchUnchecked')} />
                <span>{t('dev.themeStates.switchUnchecked')}</span>
              </label>
              <label className="flex cursor-not-allowed items-center gap-2">
                <Switch aria-label={t('dev.themeStates.switchDisabled')} disabled />
                <span>{t('dev.themeStates.switchDisabled')}</span>
              </label>
            </div>
          </div>

          <div className="grid gap-4 rounded-md border border-border bg-surface-2 p-4 xl:col-span-2 md:grid-cols-3">
            <div data-testid="progressMatrix">
              <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.progressMatrix')}</p>
              <div className="grid gap-4 rounded-md border border-border bg-surface p-4">
                <ProgressBar value={32} aria-label={t('dev.themeStates.progressLow')} />
                <ProgressBar value={76} aria-label={t('dev.themeStates.progressHigh')} />
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.skeletonMatrix')}</p>
              <div
                data-testid="skeletonPreview"
                className="grid gap-3 rounded-md border border-border bg-surface p-4"
              >
                <Skeleton className="h-[calc(18px*var(--app-scale))] w-2/5" />
                <Skeleton className="h-[calc(14px*var(--app-scale))] w-full" />
                <Skeleton className="h-[calc(14px*var(--app-scale))] w-4/5" />
              </div>
            </div>
            <Empty
              title={t('dev.themeStates.emptyTitle')}
              description={t('dev.themeStates.emptyDesc')}
              action={<Button variant="outline">{t('dev.themeStates.emptyAction')}</Button>}
            />
          </div>
        </div>
      </section>

      <section
        data-testid="step7Matrix"
        className="rounded-lg border border-border bg-surface p-4 shadow-card-sm"
      >
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">{t('dev.themeStates.step7Matrix')}</h2>
          <p className="text-sm text-text-2">{t('dev.themeStates.step7MatrixDesc')}</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.5fr)]">
          <div>
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.dataTableMatrix')}</p>
            <div className="grid gap-4">
              <SummaryStrip
                aria-label={t('dev.themeStates.dataTableMatrix')}
                items={[
                  { label: t('dev.themeStates.tableStatusEnabled'), value: 42 },
                  { label: t('dev.themeStates.dataTableSelected'), value: 3 },
                ]}
              />
              <DataToolbar variant="surface" aria-label={t('dev.themeStates.dataTableMatrix')}>
                <DataToolbarGroup>
                  <SearchField placeholder={t('dev.themeStates.fieldSearchPlaceholder')} />
                </DataToolbarGroup>
                <DataToolbarGroup align="end">
                  <Button size="sm" variant="outline">
                    {t('dev.themeStates.tableActionView')}
                  </Button>
                </DataToolbarGroup>
              </DataToolbar>
              {dataTableSelectionStates.map((state) => (
                <div key={state.id} data-testid={`datatable-selection-${state.id}`} className="grid gap-2">
                  <p className="text-sm font-medium text-text">
                    {state.id === 'partial'
                      ? t('dev.themeStates.choiceIndeterminate')
                      : state.id === 'all'
                        ? t('dev.themeStates.choiceChecked')
                        : t('dev.themeStates.dataTableSelected')}
                  </p>
                  <DataTable
                    columns={dataTableColumns}
                    data={state.rows}
                    rowKey={(row) => row.id}
                    emptyText={t('dev.themeStates.dataTableEmpty')}
                    loadingText={t('dev.themeStates.dataTableLoading')}
                    selection={{
                      enabled: true,
                      rowSelection: state.rowSelection,
                      onRowSelectionChange: noopDataTableRowSelectionChange,
                      selectAllAriaLabel: t('dev.themeStates.dataTableSelectAll'),
                      rowSelectAriaLabel: (row) =>
                        t('dev.themeStates.dataTableSelectRow', { name: t(row.nameKey) }),
                      renderBulkBar: (ids) => (
                        <div className="mb-3 rounded-8 bg-(--table-row-bg-selected) px-3 py-2 text-sm text-text-2">
                          {ids.length}
                        </div>
                      ),
                    }}
                    pagination={
                      state.id === 'partial'
                        ? {
                            page: 2,
                            pageCount: 4,
                            total: 42,
                            refreshing: true,
                            totalLabel: t('dev.themeStates.paginationTotal'),
                            refreshingLabel: t('dev.themeStates.paginationRefreshing'),
                            prevLabel: t('dev.themeStates.paginationPrev'),
                            nextLabel: t('dev.themeStates.paginationNext'),
                            currentLabel: t('dev.themeStates.paginationCurrent'),
                            onPageChange: () => undefined,
                          }
                        : undefined
                    }
                  />
                </div>
              ))}
              <DataTable
                columns={dataTableColumns}
                data={[]}
                rowKey={(row) => row.id}
                loading
                emptyText={t('dev.themeStates.dataTableEmpty')}
                loadingText={t('dev.themeStates.dataTableLoading')}
              />
              <DataTable
                columns={dataTableColumns}
                data={[]}
                rowKey={(row) => row.id}
                emptyText={t('dev.themeStates.dataTableEmpty')}
                loadingText={t('dev.themeStates.dataTableLoading')}
              />
              <DataTable
                columns={dataTableColumns}
                data={[]}
                rowKey={(row) => row.id}
                error
                errorText={t('dev.themeStates.dataTableError')}
                retryText={t('errors.retry')}
                onRetry={() => undefined}
                emptyText={t('dev.themeStates.dataTableEmpty')}
                loadingText={t('dev.themeStates.dataTableLoading')}
              />
              <div data-testid="queryStateMatrix" className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium text-text">
                    {t('dev.themeStates.queryStateMatrix')}
                  </p>
                  <QueryState
                    data={undefined}
                    pending
                    error={false}
                    loadingLabel={t('dev.themeStates.dataTableLoading')}
                    errorLabel={t('dev.themeStates.dataTableError')}
                    retryLabel={t('errors.retry')}
                    onRetry={() => undefined}
                    className="min-h-32"
                  >
                    {() => null}
                  </QueryState>
                </div>
                <QueryState
                  data={undefined}
                  pending={false}
                  error
                  loadingLabel={t('dev.themeStates.dataTableLoading')}
                  errorLabel={t('dev.themeStates.dataTableError')}
                  retryLabel={t('errors.retry')}
                  onRetry={() => undefined}
                  className="min-h-32"
                >
                  {() => null}
                </QueryState>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.tableShellMatrix')}</p>
            <TableShell
              header={
                <TableShellHeader gridTemplateColumns={step7GridTemplate}>
                  <div>{t('dev.themeStates.tableName')}</div>
                  <div>{t('dev.themeStates.tableStatus')}</div>
                  <div>{t('dev.themeStates.tableAction')}</div>
                </TableShellHeader>
              }
            >
              <TableShellRow gridTemplateColumns={step7GridTemplate} data-state="selected">
                <div className="font-medium text-text">{t('dev.themeStates.tableSelected')}</div>
                <div className="text-sm text-text-2">{t('dev.themeStates.tableStatusEnabled')}</div>
                <Button variant="link" size="xs">
                  {t('dev.themeStates.tableActionView')}
                </Button>
              </TableShellRow>
              {tableTokenRows.slice(1).map((row) => (
                <TableShellRow
                  key={row}
                  gridTemplateColumns={step7GridTemplate}
                  aria-expanded={row === 'expanded'}
                >
                  <div className="font-medium text-text">{t(`dev.themeStates.tableRows.${row}`)}</div>
                  <div className="text-sm text-text-2">{t('dev.themeStates.tableStatusEnabled')}</div>
                  <Button variant="link" size="xs">
                    {t('dev.themeStates.tableActionView')}
                  </Button>
                </TableShellRow>
              ))}
            </TableShell>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.treeStateMatrix')}</p>
            <Tree
              variant="management"
              nodes={treeNodes}
              selectedId="rd"
              onSelect={() => undefined}
              onToggle={() => setTreeExpanded((current) => !current)}
              ariaLabel={t('dev.themeStates.treeAriaLabel')}
            />
          </div>

          <div className="xl:col-start-2">
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.shellStateMatrix')}</p>
            <div className="overflow-hidden rounded-10 border border-(--side-list-border)">
              <SideList
                items={sideListItems}
                activeId={sideListActive}
                onSelect={(id) => setSideListActive(id as typeof sideListActive)}
              />
            </div>
            <Pagination
              page={2}
              pageCount={4}
              totalLabel={t('dev.themeStates.paginationTotal')}
              refreshingLabel={t('dev.themeStates.paginationRefreshing')}
              prevLabel={t('dev.themeStates.paginationPrev')}
              nextLabel={t('dev.themeStates.paginationNext')}
              currentLabel={t('dev.themeStates.paginationCurrent')}
              onPageChange={() => undefined}
            />
            <div className="mt-4 grid gap-3" data-testid="fileDropzoneMatrix">
              <p className="text-sm font-medium text-text">{t('dev.themeStates.fileDropzoneMatrix')}</p>
              <FileDropzone
                label={t('dev.themeStates.fileDropzoneLabel')}
                hint={t('dev.themeStates.fileDropzoneHint')}
                inputLabel={t('dev.themeStates.fileDropzoneInput')}
                files={[]}
                onFiles={() => undefined}
              />
              <FileDropzone
                label={t('dev.themeStates.fileDropzoneLabel')}
                hint={t('dev.themeStates.fileDropzoneHint')}
                inputLabel={t('dev.themeStates.fileDropzoneDisabled')}
                files={[]}
                disabled
                onFiles={() => undefined}
              />
            </div>
          </div>

          <div
            data-testid="pageThreePaneMatrix"
            className="min-h-[calc(280px*var(--app-scale))] overflow-hidden rounded-10 border border-(--page-surface-border) xl:col-span-2"
          >
            <PageThreePane>
              <PagePane variant="navigation">
                <PagePaneHeader title={t('dev.themeStates.shellStateMatrix')} />
                <PagePaneBody>
                  <SideCardList
                    activeId="members"
                    onSelect={() => undefined}
                    items={[
                      {
                        id: 'members',
                        label: t('dev.themeStates.sideList.members'),
                        ariaLabel: t('dev.themeStates.sideList.members'),
                        description: t('dev.themeStates.tableStatusEnabled'),
                        icon: <CheckIcon data-icon="inline" />,
                        action: (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t('dev.themeStates.tableActionEdit')}
                          >
                            <CheckIcon data-icon="inline" />
                          </Button>
                        ),
                      },
                      {
                        id: 'roles',
                        label: t('dev.themeStates.sideList.roles'),
                        ariaLabel: t('dev.themeStates.sideList.roles'),
                        description: t('dev.themeStates.dataTableNormal'),
                      },
                    ]}
                  />
                </PagePaneBody>
                <PagePaneFooter>
                  <Button type="button" variant="dashed" block>
                    {t('dev.themeStates.tableActionEdit')}
                  </Button>
                </PagePaneFooter>
              </PagePane>
              <PagePane variant="master">
                <PagePaneHeader title={t('dev.themeStates.treeStateMatrix')} />
                <PagePaneBody>{t('dev.themeStates.treeNodes.all')}</PagePaneBody>
              </PagePane>
              <PagePane variant="detail">
                <PagePaneHeader title={t('dev.themeStates.tableSelected')} />
                <PagePaneBody>{t('dev.themeStates.tableStatusEnabled')}</PagePaneBody>
              </PagePane>
            </PageThreePane>
          </div>
        </div>
      </section>

      <section
        data-testid="step8OverlayOptionMatrix"
        className="rounded-lg border border-border bg-surface p-4 pb-36 shadow-card-sm"
      >
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">{t('dev.themeStates.step8Matrix')}</h2>
          <p className="text-sm text-text-2">{t('dev.themeStates.step8MatrixDesc')}</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-md border border-border bg-surface-2 p-4">
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.overlayPopover')}</p>
            <div className="grid justify-start gap-2">
              <Button variant="outline">{t('dev.themeStates.overlayTrigger')}</Button>
              <div
                data-slot="popover-content"
                className="anim-modal-in w-[calc(220px*var(--app-scale))] rounded-10 border border-(--overlay-border) bg-(--overlay-bg) p-2 text-(--overlay-fg) shadow-(--overlay-shadow-popover)"
              >
                <div className="grid gap-1.5">
                  <p className="text-sm font-medium text-text">{t('dev.themeStates.overlayTitle')}</p>
                  <p className="text-xs text-text-2">{t('dev.themeStates.overlayDesc')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface-2 p-4">
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.optionSelect')}</p>
            <div className="grid gap-2">
              <button
                type="button"
                aria-expanded="true"
                aria-haspopup="listbox"
                className="ui-field flex h-[var(--control-md)] w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border px-(--field-px) text-sm outline-none"
                data-state="open"
              >
                <span>{t('dev.themeStates.fieldResearch')}</span>
                <ChevronDownIcon data-icon="inline-end" className="rotate-180" />
              </button>
              <div
                data-slot="select-content"
                role="listbox"
                className="anim-modal-in overflow-hidden rounded-10 border border-(--overlay-border) bg-(--overlay-bg) p-1 text-(--overlay-fg) shadow-(--overlay-shadow-popover)"
              >
                <div
                  data-slot="select-item"
                  role="option"
                  aria-selected="true"
                  className="relative flex min-h-[calc(32px*var(--app-scale))] w-full items-center gap-2 rounded-7 bg-(--option-bg-selected) py-1 pr-8 pl-2 text-sm font-semibold text-(--option-fg-selected)"
                >
                  <span
                    data-slot="select-item-indicator"
                    className="absolute right-2 flex size-3.5 items-center justify-center text-(--option-check)"
                  >
                    <CheckIcon
                      data-icon="inline-start"
                      className="size-[calc(15px*var(--app-scale))] stroke-[3px]"
                    />
                  </span>
                  {t('dev.themeStates.fieldResearch')}
                </div>
                <div
                  data-slot="select-item"
                  role="option"
                  className="relative flex min-h-[calc(34px*var(--app-scale))] w-full items-center gap-2 rounded-8 bg-(--option-bg-highlighted) py-1.5 pr-8 pl-2 text-sm text-(--option-fg-highlighted)"
                >
                  {t('dev.themeStates.optionHighlighted')}
                </div>
                <div
                  data-slot="select-item"
                  role="option"
                  aria-disabled="true"
                  data-disabled
                  className="relative flex min-h-[calc(34px*var(--app-scale))] w-full items-center gap-2 rounded-8 py-1.5 pr-8 pl-2 text-sm text-(--option-fg) data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  {t('dev.themeStates.choiceDisabled')}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface-2 p-4">
            <p className="mb-3 text-sm font-medium text-text">{t('dev.themeStates.menuMatrix')}</p>
            <div className="grid justify-start gap-2">
              <Button variant="outline">{t('dev.themeStates.menuTrigger')}</Button>
              <div
                data-slot="dropdown-menu-content"
                role="menu"
                className="anim-modal-in w-[calc(220px*var(--app-scale))] overflow-hidden rounded-14 border border-(--overlay-border) bg-(--overlay-bg) p-1 text-(--overlay-fg) shadow-(--overlay-shadow-popover)"
              >
                <div
                  data-slot="dropdown-menu-item"
                  role="menuitem"
                  className="relative flex cursor-pointer items-center gap-2 rounded-8 px-2 py-1.5 text-sm text-(--menu-item-fg)"
                >
                  {t('dev.themeStates.menuNormal')}
                </div>
                <div
                  data-slot="dropdown-menu-item"
                  role="menuitem"
                  className="relative flex cursor-pointer items-center gap-2 rounded-8 bg-(--menu-item-bg-highlighted) px-2 py-1.5 text-sm text-(--menu-item-fg-highlighted)"
                >
                  {t('dev.themeStates.menuHighlighted')}
                </div>
                <div data-slot="dropdown-menu-separator" className="-mx-1 my-1 h-px bg-border" />
                <div
                  data-slot="dropdown-menu-item"
                  role="menuitem"
                  data-variant="destructive"
                  className="relative flex cursor-pointer items-center gap-2 rounded-8 px-2 py-1.5 text-sm text-(--menu-item-fg-danger)"
                >
                  {t('dev.themeStates.menuDanger')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
