# 通用后台脚手架主题深化与组件 Token 体系 Spec

- 日期：2026-07-04
- 状态：对抗性审查后定稿候选
- 范围：主题风格、基础 UI、Pro 组件、页面级样式约束、验证体系
- 不在本 spec 范围：业务接口改造、路由重构、权限模型、mock 数据域扩展

## 1. 背景

当前脚手架已经有 `feishu`、`claude`、`shadcn` 三种界面风格，并通过 `<html data-flavor>`、`data-mode`、`data-radius`、显示比例 token `--app-scale` 与 CSS variables 控制外观。

现有机制解决了基础换肤问题，但主要停留在全局色彩层：

- `--bg`
- `--canvas`
- `--surface`
- `--chrome`
- `--surface-2`
- `--text`
- `--text-2`
- `--text-3`
- `--border`
- `--pri`
- `--pri-soft`

基础组件内部仍直接消费通用 token，例如：

- `Input` 使用 `bg-surface`、`border-input`、`focus-visible:border-pri`、`focus-visible:ring-soft`
- `SelectTrigger` 使用 `bg-surface`、`border-input`、`data-[state=open]:border-pri`
- `Button` variants 直接使用 `bg-pri`、`hover:bg-pri-hover`、`bg-surface`、`hover:border-pri`
- `Tabs` active 态直接使用 `text-pri`、`after:bg-pri`
- `.ui-field:focus-within` 在 `global.css` 里直接使用 `--surface`、`--pri`、`--danger`

这会导致一个问题：切换界面风格时，视觉变化主要像“换配色”，不是“切换设计体系”。

## 2. 目标

建立一套能支撑长期演化的主题深化机制，使界面风格不仅改变全局颜色，也能改变组件的正常态、hover 态、active 态、focus-visible 态、focus-within 态、open 态、disabled 态、invalid 态、selected 态、expanded 态、pressed 态、highlighted 态和弹层形态。

最终目标：

1. 选择一种 `flavor` 后，基础 UI、Pro 组件、Shell 组件和页面级组合都能自动吃到该风格的完整状态 token。
2. 业务页面不关心主题机制，只组合组件和业务数据。
3. 组件源码不写 `if flavor === 'feishu'` 这类分支。
4. 主题差异集中在 token 层，组件结构集中在 `components/ui` 与 `components/pro`。
5. 后续新增风格时，以新增 token block 为主，不大面积改组件代码。

## 3. 非目标

以下事情本阶段不做：

1. 不引入 Ant Design、Arco Design、Material UI 等完整组件库替换当前组件。
2. 不把 `shadcn` 理解为 npm 黑盒组件库；当前仍然坚持 shadcn/ui 的 open code 模式。
3. 不引入 CSS-in-JS 主题运行时。
4. 不重写 Select、Dialog、Dropdown、Popover 的焦点管理、键盘导航、aria、outside event、autoFocus、Escape 等基础交互逻辑。
5. 不一次性重写所有业务页面样式。
6. 不把每个页面都做成独立主题适配点。
7. 不用运行时 JS 为每个组件注入状态 token；组件 token 必须主要由 CSS 根据 `html[data-*]` 派生。

## 4. 设计原则

### 4.1 分层依赖矩阵

主题系统必须分层，不允许所有组件直接消费 `--pri`、`--surface`、`--border` 来表达具体组件状态。

目标分层：

```text
Primitive Tokens
  -> Semantic Tokens
    -> UI Component State Tokens
      -> Pro Component Tokens
        -> Shell / Page Composition
```

依赖约束：

| 层级 | 允许定义 | 允许依赖 | 禁止事项 |
| --- | --- | --- | --- |
| Primitive | 原始色、阴影、圆角、空间、基础品牌色 | 无或自身派生 | 被页面直接用来表达控件状态 |
| Semantic | `background`、`foreground`、`primary`、`muted`、`accent`、`input`、`ring` | Primitive | 带具体组件名，例如 `field`、`button` |
| UI Component State | `--field-bg-focus-within`、`--button-primary-bg-hover` | Semantic / Primitive | 判断 flavor、重写交互逻辑 |
| Pro Component | `--pro-toolbar-bg`、`--side-list-item-bg-active` | UI Component / Semantic | 重新定义 Button/Input/Table 的基础状态 |
| Shell/Nav | `--shell-bg`、`--nav-item-bg-current` | UI Component / Semantic | 把导航状态散落到业务页面 |
| Page | 布局、区域组合、业务内容密度 | Pro / UI 组件 | 定义基础控件 hover/focus/active/selected 样式 |

`State Tokens` 不作为独立层存在。`--field-bg-focus` 这种变量本质是“组件状态 token”，必须归属到对应组件族。

### 4.2 组件无 flavor 分支

组件代码只消费 token，不判断当前风格。

错误方向：

```tsx
flavor === 'feishu' ? 'bg-white' : 'bg-zinc-950'
```

正确方向：

```tsx
'bg-(--field-bg) focus-visible:border-(--field-border-focus-visible)'
```

Tailwind v4 变量类优先使用 `bg-(--token)`、`text-(--token)`、`border-(--token)`、`ring-(--token)` 形式。避免 `bg-[var(--token)]`，除非 Tailwind 语法无法表达。

### 4.3 基础逻辑用成熟 primitive

组件交互逻辑继续依赖 shadcn/ui + Radix。我们负责样式、组合、状态 token 和业务组件，不从零实现选择弹层、焦点管理、键盘导航、aria 属性。

当前 shadcn 项目事实必须保留：

- `components.json` 的 `base = radix`
- `style = new-york`
- Tailwind CSS v4
- `iconLibrary = lucide`

### 4.4 基础层收敛，页面层克制

普通后台页面不应该到处写内联样式或任意 class 来修细节。列表页、表单页、详情页、弹窗、侧边栏、筛选区、工具栏等常见形态，要尽量沉到基础 UI 和 Pro 组件。

页面层只允许表达：

- 布局网格
- 业务区域顺序
- 数据驱动的显隐
- 少量业务专属视觉

页面层禁止表达：

- Input/Button/Select/Table/Tabs 的通用 hover/focus/active/selected 状态
- Dialog/Sheet close button 的局部样式
- 表格行 hover、表头背景、操作按钮颜色
- 导航项 current/expanded 的基础视觉

### 4.5 Token 是契约，不是随手变量

新增 token 必须满足：

1. 名称能表达使用场景。
2. 有默认 fallback。
3. 至少被一个组件消费。
4. 有测试或文档说明。
5. 不和已有 token 重叠。
6. 第一批每个组件族新增 token 原则上不超过 24 个；超过必须在 spec 或 PR 说明原因。
7. 不允许先批量落一堆未消费 token。

## 5. 现状基线

### 5.1 当前 flavor 机制

当前核心文件：

- `src/styles/tokens.css`
- `src/styles/global.css`
- `src/lib/appearance-dom.ts`
- `src/stores/appearance.ts`
- `src/app/shell/widgets/AppearanceDrawer.tsx`

当前已有 flavor：

```ts
type Flavor = 'feishu' | 'claude' | 'shadcn';
```

`applyAppearance` 会写入：

- `data-flavor`
- `data-mode`
- `data-radius`
- 显示比例相关 CSS variable
- `--pri`
- `--pri-soft`

### 5.2 当前 token 覆盖范围

当前 token 主要覆盖：

- 页面背景
- 内容面背景
- Chrome / Sidebar / Header 背景
- 文本层级
- 边框
- 主色
- 主色浅底
- 圆角
- 显示比例
- 通用 shadow
- 通用 focus ring

### 5.3 当前组件状态问题

| 组件 | 当前状态写法 | 问题 |
| --- | --- | --- |
| Input | `bg-surface` / `focus-visible:border-pri` / `ring-soft` | 不同 flavor 无法定义独立输入体验 |
| `.ui-field` | `focus-within` 直接使用 `--pri`、`--surface` | 全局状态钩子绕过组件 token |
| Textarea | 同 Input | 复用不彻底 |
| NativeSelect | 同 Input | 只能作为兼容路径，不能作为主 Select 体验 |
| SelectTrigger | `data-[state=open]:border-pri` | open/focus 状态无法分别设计 |
| SelectItem | `focus:bg-pri-soft text-pri` | highlighted/checked/selected 绑定主色 |
| DropdownMenuItem | 消费 `bg-accent/text-accent-foreground` | 直接改 `--accent` 会造成未迁移组件漂移 |
| Button | variants 内直接写 `bg-pri`、`border-border`、`hover:border-pri` | variant 行为无法按风格变化 |
| Tabs | `text-pri`、`after:bg-pri` | indicator、active 背景、hover 不能按风格变化 |
| Dialog / Sheet | close button 局部 class | 关闭按钮状态未抽象 |
| Table | `bg-surface-2`、`hover:bg-surface-2` | 表头、行 hover、selected、expanded 状态耦合 |
| Checkbox | 自写 native input | 不能假设 Radix `data-state` API |

## 6. 目标架构

### 6.1 总体结构

```text
src/styles/
  tokens.css
    1. flavor primitive/semantic tokens
    2. global derived tokens
    3. ui component state tokens
    4. pro/shell component tokens

  global.css
    1. Tailwind @theme inline mapping
    2. base reset
    3. low-level state hooks consuming component tokens
    4. animation keyframes

src/components/ui/
  consume ui component state tokens

src/components/pro/
  compose ui components and consume pro tokens

src/app/shell/
  consume shell/nav tokens and ui components

src/modules/*/pages/
  compose pro/ui components
```

### 6.2 Token 定义

#### Primitive Tokens

基础原材料，尽量不直接给组件消费。

示例：

```css
--pri: #3370ff;
--surface: #ffffff;
--border: #e5e6eb;
--text: #1f2329;
--shadow-popover: 0 12px 40px rgba(0, 0, 0, 0.16);
--radius-8: calc(8px * var(--radius-factor) * var(--app-scale));
```

#### Semantic Tokens

表达通用语义，可以映射到 shadcn/Tailwind 词汇。

示例：

```css
--background: var(--bg);
--foreground: var(--text);
--card: var(--surface);
--popover: var(--surface);
--primary: var(--pri);
--primary-foreground: var(--on-pri);
--muted: var(--surface-2);
--accent: var(--surface-2);
--accent-foreground: var(--text);
--input: var(--border);
--ring: var(--pri);
```

注意：不要在 Step 1 直接把 `--accent` 大面积改成 `--pri-soft`。当前未迁移的 DropdownMenu 等组件仍消费 `bg-accent/text-accent-foreground`，贸然修改会造成全局视觉漂移。`--accent` 的最终语义要在 Option/Menu 切片完成后再调整。

#### UI Component State Tokens

面向具体基础组件族。组件族优先，不要过早细化到每个文件。

第一批组件族：

- Field Family：Input、Textarea、SelectTrigger、NativeSelect 兼容路径、Field、Form、InputGroup、SearchField
- Option Family：SelectItem、DropdownMenuItem、Combobox option、Command item
- Button Family：Button、IconButton、link/action button、close button
- Tabs Family：Tabs、AnimatedTabs
- Overlay Family：Dialog、Sheet、Popover、DropdownMenu、Tooltip、SelectContent
- Table Family：Table、TableShell、Pagination
- Choice Family：Checkbox、RadioGroup、Switch
- Feedback Family：Badge、Progress、Skeleton、Alert、Empty

示例：

```css
--field-bg;
--field-bg-hover;
--field-bg-focus-within;
--field-border-focus-visible;
--field-border-invalid;
--field-ring-focus-visible;
--option-bg-highlighted;
--button-primary-bg-hover;
```

#### Pro / Shell Tokens

面向后台通用业务组件和稳定 Shell，不直接进入基础 UI。

示例：

```css
--pro-page-bg;
--pro-panel-bg;
--pro-toolbar-bg;
--side-list-item-bg-active;
--shell-header-bg;
--nav-item-bg-current;
```

Pro token 可以组合 UI token，但不重新定义基础 UI 状态。例如不要新增 `--pro-table-header-bg` 来覆盖 `--table-header-bg`，除非它表达的是 Table 外层业务容器。

## 7. Token 命名规范

### 7.1 命名格式

统一使用：

```text
--<scope>-<part>-<property>-<state>
```

允许简化：

```text
--field-bg
--field-border-focus-visible
--button-primary-bg-hover
--option-bg-selected
```

### 7.2 scope 清单

第一阶段允许的 scope：

- `field`
- `option`
- `button`
- `tabs`
- `overlay`
- `popover`
- `dialog`
- `sheet`
- `table`
- `choice`
- `switch`
- `badge`
- `feedback`
- `nav`
- `shell`
- `side-list`
- `pro`

### 7.3 property 清单

优先使用：

- `bg`
- `fg`
- `border`
- `ring`
- `shadow`
- `radius`
- `height`
- `padding-x`
- `padding-y`
- `indicator`
- `icon`
- `placeholder`

### 7.4 state 清单

优先使用：

- `base`
- `hover`
- `active`
- `focus-visible`
- `focus-within`
- `open`
- `highlighted`
- `selected`
- `checked`
- `indeterminate`
- `expanded`
- `pressed`
- `current`
- `disabled`
- `readonly`
- `invalid`
- `loading`
- `skeleton`
- `empty`

状态含义：

- `focus-visible`：键盘或浏览器判定需要可见焦点时使用。
- `focus-within`：包装容器内部有焦点时使用，例如 `.ui-field`。
- `highlighted`：Radix Select/Menu/Command 当前键盘或鼠标高亮项。
- `current`：导航或面包屑当前项。
- `pressed`：toggle 类按钮的按下态。
- `expanded`：树、菜单、表格行展开态。

### 7.5 状态优先级

同一组件多个状态同时存在时，优先级统一为：

```text
disabled / loading
  > invalid
  > open / focus-visible / focus-within
  > checked / selected / expanded / pressed / current / highlighted
  > active
  > hover
  > base
```

约束：

1. disabled/loading 必须压过所有交互态。
2. invalid 必须压过 focus/open，但可以保留可访问性 ring。
3. open/focus-visible/focus-within 必须压过 hover。
4. selected 与 highlighted 同时存在时，必须有可读优先级；不能出现文字和背景对比不足。
5. 禁止用 `!important` 解决优先级，除非补测试并在 PR 说明。

### 7.6 禁止命名

禁止用视觉色名命名组件状态：

```css
--field-blue-border
--button-gray-hover
--table-light-bg
```

禁止用当前产品名污染基础 token：

```css
--feishu-input-focus
--claude-button-bg
```

flavor 应该定义 token 值，而不是进入 token 名称。

## 8. shadcn / Radix 硬约束

本项目使用 shadcn/ui open code，但不等于可以重写底层交互。主题改造必须遵守以下约束：

1. Radix `Trigger`、`Close` 使用自定义子元素时必须用 `asChild`，不得包额外无语义 `div`。
2. Dialog/Sheet 必须保留 `DialogTitle`/`SheetTitle`；视觉隐藏时用 `sr-only`。
3. `DialogContent` 当前默认阻止 outside click 关闭父弹窗，该行为必须保留，尤其要覆盖“Dialog 内 Select 打开后点击其他表单控件不误关父 Dialog”。
4. Overlay 不改 Portal、Content、Trigger、outside event、autoFocus、Escape 行为；只改 class/token。
5. Portal token 必须定义在 `:root` 或 `html[data-*]`，不能挂在 app 子树，因为 Radix Portal 会脱离组件原 DOM。
6. Select/Popover/Dropdown/Tooltip 必须保留 Radix CSS variables，例如 `--radix-select-trigger-width`、`--radix-select-content-available-height`、`--radix-select-content-transform-origin`。
7. Portal 弹层动画必须继续基于 `data-state`、`data-side`、`data-align`。
8. `SelectItem` 必须在 `SelectGroup` 内；`DropdownMenuItem`、`DropdownMenuLabel`、`DropdownMenuSub` 应在 `DropdownMenuGroup` 体系内组织。
9. 表单布局优先 `FieldGroup` + `Field`；校验态必须同时具备 `Field data-invalid` 与控件 `aria-invalid`。
10. Button 不新增 `isLoading` / `isPending` API，继续使用现有 `loading` / `ButtonSpinner` 或组合 `Spinner + data-icon + disabled`。
11. Button、菜单、输入组里的图标使用 `data-icon`，由组件统一控尺寸，避免散落 `size-*`。
12. Checkbox 是自写 native input，不是 Radix Checkbox，不能假设 `data-state` API。

## 9. 各层级设计方案

### 9.1 Primitive / Semantic 层

保留当前 `tokens.css` 的 flavor block，但补齐语义 token 别名和派生关系。

要求：

1. `feishu`、`claude`、`shadcn` 都必须定义完整 light/dark 基础 token。
2. `--pri` 和 `--pri-soft` 仍由 appearance runtime 注入，但组件不要直接消费它们表达具体状态。
3. `--on-pri` 不应长期固定 `#ffffff`，需要变成 flavor 可覆盖 token。
4. `global.css` 中 shadcn semantic 映射的硬编码 foreground 需要收敛到 CSS 变量。
5. `global.css` 低层状态钩子必须消费组件 token，例如 `.ui-field:focus-within` 使用 `--field-*`。

### 9.2 Field Family

范围：

- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/native-select.tsx`
- `src/components/ui/select.tsx` 中的 `SelectTrigger`
- `src/components/ui/field.tsx`
- `src/components/ui/form.tsx`
- `src/components/pro/SearchField.tsx`
- `InputGroup` / `InputGroupAddon`

NativeSelect 是兼容路径，不作为主 Select 体验。常规业务选择器优先使用 shadcn/Radix Select。

第一批 token：

```css
:root {
  --field-bg: var(--surface);
  --field-bg-hover: var(--surface);
  --field-bg-focus-within: var(--surface);
  --field-bg-open: var(--surface);
  --field-bg-disabled: var(--surface-2);
  --field-bg-readonly: var(--surface-2);

  --field-fg: var(--text);
  --field-placeholder: var(--text-3);
  --field-icon: var(--text-3);
  --field-addon-bg: var(--surface-2);
  --field-addon-fg: var(--text-3);

  --field-border: var(--border);
  --field-border-hover: var(--control-border);
  --field-border-focus-visible: var(--pri);
  --field-border-focus-within: var(--pri);
  --field-border-open: var(--pri);
  --field-border-invalid: var(--danger);

  --field-ring-focus-visible: var(--soft);
  --field-ring-focus-within: var(--soft);
  --field-ring-invalid: var(--danger-bg);
  --field-shadow: var(--shadow-card-sm);
}
```

验收重点：

- 输入框 focus 后背景能独立变白。
- `focus-visible` 和 `focus-within` 视觉不同但一致协调。
- focus/open 态压过 hover 态。
- invalid 态压过 focus/open。
- Select open 态和 Input focus 态视觉一致。
- `Field data-invalid` 与控件 `aria-invalid` 同步。
- disabled/readOnly 不再靠 opacity 单独表达。

### 9.3 Option Family

范围：

- `SelectItem`
- `DropdownMenuItem`
- 后续 Combobox / Command item
- `LanguageMenu`、`UserMenu` 中可迁移的菜单项

第一批 token：

```css
:root {
  --option-bg: transparent;
  --option-bg-hover: var(--surface-2);
  --option-bg-highlighted: var(--pri-soft);
  --option-bg-selected: var(--pri-soft);
  --option-bg-disabled: transparent;

  --option-fg: var(--text);
  --option-fg-muted: var(--text-3);
  --option-fg-highlighted: var(--pri);
  --option-fg-selected: var(--pri);
  --option-fg-disabled: var(--text-3);
  --option-icon: var(--text-3);
  --option-check: var(--pri);
}
```

要求：

1. `hover`、`highlighted`、`checked/selected` 视觉语义要区分。
2. Select 弹层里的选项不能用浏览器默认 select。
3. 菜单项、SelectItem、CommandItem 的交互状态要尽量统一。
4. selected 与 highlighted 同时存在时要保证文字可读。
5. `SelectGroup` / `DropdownMenuGroup` 组合约束必须写入组件和示例。

### 9.4 Button Family

范围：

- `src/components/ui/button.tsx`
- Dialog / Sheet close button
- Header icon button
- Table action button
- AppearanceDrawer segment button

当前 Button variants 必须全部纳入合同：

- `primary`
- `default`
- `secondary`
- `outline`
- `dashed`
- `text`
- `ghost`
- `link`
- `danger`
- `destructive`
- `danger-ghost`

第一批 token：

```css
:root {
  --button-primary-bg: var(--pri);
  --button-primary-bg-hover: var(--pri-hover);
  --button-primary-bg-active: var(--pri-active);
  --button-primary-fg: var(--on-pri);
  --button-primary-border: transparent;

  --button-secondary-bg: var(--surface);
  --button-secondary-bg-hover: var(--surface-2);
  --button-secondary-bg-active: var(--surface-2);
  --button-secondary-fg: var(--text);
  --button-secondary-border: var(--border);
  --button-secondary-border-hover: var(--control-border);

  --button-ghost-bg-hover: var(--surface-2);
  --button-ghost-fg: var(--text-2);
  --button-ghost-fg-hover: var(--text);

  --button-text-fg: var(--pri);
  --button-text-bg-hover: var(--pri-soft);
  --button-link-fg: var(--pri);

  --button-danger-bg: var(--danger);
  --button-danger-bg-hover: var(--danger-hover);
  --button-danger-fg: var(--danger-foreground);
  --button-danger-ghost-bg-hover: var(--danger-bg);

  --button-icon-bg-hover: var(--surface-2);
  --button-icon-fg: var(--text-3);
  --button-icon-fg-hover: var(--text);
  --button-ring: var(--soft);
}
```

要求：

1. close button 统一走 icon button token。
2. 可点击元素必须 `cursor-pointer`，disabled 必须 `cursor-not-allowed`。
3. loading 态继续保留当前 `ButtonSpinner` 组合方式，不引入 `isPending` prop。
4. danger 和 destructive 要保持兼容，不允许只迁一个。

### 9.5 Tabs Family

范围：

- `src/components/ui/tabs.tsx`
- `src/components/pro/AnimatedTabs.tsx`

`AnimatedTabs` 是自写 tablist，不是 Radix Tabs，必须单独验收键盘导航和 aria。

第一批 token：

```css
:root {
  --tabs-list-bg: var(--surface-2);
  --tabs-list-border: var(--border);
  --tabs-trigger-bg: transparent;
  --tabs-trigger-bg-hover: transparent;
  --tabs-trigger-bg-active: var(--surface);
  --tabs-trigger-fg: var(--text-3);
  --tabs-trigger-fg-hover: var(--text);
  --tabs-trigger-fg-active: var(--pri);
  --tabs-indicator-bg: var(--pri);
  --tabs-ring: var(--soft);
}
```

要求：

1. line tabs 的指示条必须保留动画。
2. animated tabs 的滑块或底部线条颜色走 token。
3. active、hover、focus-visible 三态不能互相覆盖错乱。
4. tab hover 应显示 `cursor-pointer`，disabled tab 除外。

### 9.6 Overlay Family

范围：

- Dialog
- Sheet
- Popover
- DropdownMenu
- Tooltip
- SelectContent

第一批 token：

```css
:root {
  --overlay-mask-bg: rgba(0, 0, 0, 0.42);
  --overlay-bg: var(--surface);
  --overlay-fg: var(--text);
  --overlay-border: var(--border);
  --overlay-shadow-modal: var(--shadow-modal);
  --overlay-shadow-popover: var(--shadow-popover);
  --overlay-close-bg-hover: var(--button-icon-bg-hover);
  --overlay-close-fg: var(--button-icon-fg);
  --overlay-close-fg-hover: var(--button-icon-fg-hover);
}
```

要求：

1. Dialog / Sheet close button 视觉统一。
2. 弹层内 Select 点击其他表单控件时不能误关闭父级 Dialog。
3. popover/dropdown/select content 的阴影、圆角、边框走 overlay token。
4. 短期保留现有 `z-50`，中期收敛 overlay stack token；不要在本次主题切片里随手改层级。
5. 必须保留 Radix CSS variables 和 `data-state/data-side/data-align` 动画钩子。

### 9.7 Table Family

范围：

- `src/components/ui/table.tsx`
- `src/components/pro/TableShell.tsx`
- 用户、角色、菜单等业务表格

第一批 token：

```css
:root {
  --table-bg: var(--surface);
  --table-border: var(--border);
  --table-header-bg: var(--surface-2);
  --table-header-fg: var(--text-3);
  --table-row-bg: var(--surface);
  --table-row-bg-hover: var(--surface-2);
  --table-row-bg-selected: var(--pri-soft);
  --table-row-bg-expanded: var(--surface-2);
  --table-row-fg: var(--text);
  --table-action-fg: var(--pri);
}
```

要求：

1. 表头样式全局收敛，不允许每个页面单独手写。
2. row hover、selected、expanded 状态走 token。
3. 表格操作按钮优先走 `Button variant="link/text"` 或 Pro action 组件。
4. Pro 层不得再定义一套 `--pro-table-*` 覆盖 Table 基础状态。

### 9.8 Choice Family

范围：

- Checkbox
- RadioGroup
- Switch

第一批 token：

```css
:root {
  --choice-bg: var(--surface);
  --choice-bg-checked: var(--pri);
  --choice-bg-indeterminate: var(--pri-soft);
  --choice-border: var(--control-border);
  --choice-border-hover: var(--pri);
  --choice-border-checked: var(--pri);
  --choice-fg-checked: var(--on-pri);
  --choice-ring: var(--soft);
  --switch-bg-unchecked: var(--control-border);
  --switch-bg-checked: var(--pri);
  --switch-thumb-bg: var(--surface);
}
```

要求：

1. checkbox/radio/switch 的 focus ring 统一。
2. checked、indeterminate、disabled 状态必须可区分。
3. Checkbox 当前是 native input 实现，不按 Radix `data-state` 写选择器。

### 9.9 Feedback Family

范围：

- Badge
- Progress
- Skeleton
- Alert
- Empty

第一批 token 只覆盖公共状态，不追求过细：

```css
:root {
  --feedback-info-bg: var(--pri-soft);
  --feedback-info-fg: var(--pri);
  --feedback-success-bg: var(--success-bg);
  --feedback-success-fg: var(--success);
  --feedback-warning-bg: var(--warning-bg);
  --feedback-warning-fg: var(--warning);
  --feedback-danger-bg: var(--danger-bg);
  --feedback-danger-fg: var(--danger);
  --skeleton-bg: var(--surface-2);
  --empty-fg: var(--text-3);
}
```

要求：

1. loading/skeleton 不要沿用按钮 loading 的视觉。
2. Empty 状态不得写死灰色。
3. Badge 状态色必须可读，尤其是 dark mode。

### 9.10 Pro / Shell / Page Layer

范围：

- `PageScaffold`
- `TableShell`
- `SearchField`
- `SideList`
- `AnimatedTabs`
- `Pagination`
- `src/app/shell/widgets/AppearanceDrawer.tsx`
- `src/app/shell/widgets/GlobalSearch.tsx`
- Header icon buttons
- NavMenu / Sidebar / Rail / Inset
- 页面工具栏、筛选区、详情面板

第一批 token：

```css
:root {
  --pro-page-bg: var(--bg);
  --pro-panel-bg: var(--surface);
  --pro-panel-border: var(--border);
  --pro-toolbar-bg: var(--surface);
  --pro-filter-bg: var(--surface);
  --side-list-bg: var(--surface);
  --side-list-border: var(--border);
  --side-list-item-bg-hover: var(--surface-2);
  --side-list-item-bg-active: var(--pri-soft);
  --side-list-item-fg-active: var(--pri);
  --shell-header-bg: var(--chrome);
  --nav-item-bg-current: var(--pri-soft);
  --nav-item-fg-current: var(--pri);
}
```

要求：

1. 普通页面只能组合 Pro 组件，不直接手写大量状态样式。
2. 页面级自定义只允许处理布局差异，不允许重复定义基础控件状态。
3. 用户管理、角色管理、菜单管理作为第一批纵向验证页面。
4. Shell 层负责稳定布局和导航视觉，不由业务页面介入。

## 10. Flavor 差异策略

### 10.1 风格方向

| flavor | 设计方向 | 适用场景 |
| --- | --- | --- |
| `feishu` | 清爽中性灰、蓝色高亮、输入态白底明确、hover 轻微灰底、focus 蓝边 + 浅蓝 ring、表格密度较高 | 默认企业后台 |
| `claude` | 暖色纸感、边框低对比、面板柔和、focus 用陶土橙或暖色 ring、阴影更轻 | 低刺激、偏内容/配置型后台 |
| `shadcn` | 中性黑白灰、接近 shadcn 官方默认、hover/active 依赖 `accent/muted`、控件阴影更少 | 干净标准的工程模板基线 |

### 10.2 最小可执行差异矩阵

每个组件族至少要在 light/dark 下写明这些差异，不能只替换 `--pri`。

| 组件族 | feishu | claude | shadcn |
| --- | --- | --- | --- |
| Field | base 浅灰或白，focus 白底 + 蓝边 + 软 ring，invalid 红边但保留 ring | base 暖白，focus 暖色边 + 低对比 ring | base `background`，focus 接近官方 ring |
| Option | highlighted 浅蓝，selected 蓝字 + 浅蓝底 | highlighted 暖灰，selected 陶土色文字 | highlighted/selected 使用 `accent` 体系 |
| Button | primary 蓝，outline hover 轻蓝边，text/link 蓝 | primary 陶土橙，outline hover 暖灰 | primary 黑/白或中性，ghost/link 接近官方 |
| Tabs | active 蓝字 + 蓝色 indicator，动画明显但克制 | active 暖色，indicator 更柔和 | active 中性前景，indicator 按官方基调 |
| Overlay | mask 中性灰，popover 清晰阴影 | mask 偏暖，阴影轻 | 接近 shadcn 默认低装饰 |
| Table | header 浅灰，row hover 浅灰，selected 浅蓝 | header 暖灰，row hover 低对比 | header `muted`，hover `muted/accent` |
| Choice | checked 主蓝，indeterminate 浅蓝 | checked 陶土橙 | checked primary |
| Feedback | 信息态蓝、成功/警告/错误清晰 | 状态色降低饱和 | 接近 shadcn 状态色 |
| Shell/Nav | 侧栏浅灰，current 浅蓝底 | 侧栏暖灰，current 暖色底 | 简洁中性 current |

## 11. 实施计划

### Step 0：冻结 spec 与审查

交付物：

- 本 spec
- 对抗性审查记录
- 风险清单
- 实施任务拆分

验收：

- spec 覆盖层级、步骤、验证和影响范围。
- 至少三种审查视角完成 review。
- 所有 P0/P1 问题已回写。

### Step 1：Token Contract 与违规基线

改动范围：

- `src/styles/tokens.css`
- `src/styles/global.css`
- `src/styles/__tests__/tokens.snapshot.test.ts`
- `src/lib/appearance-dom.ts` 相关测试
- 必要时新增 token guard 测试或脚本

任务：

1. 建立 UI Component State Token 默认值。
2. 建立三套 flavor 的关键差异覆盖。
3. 把 `global.css` 里的 `.ui-field` 状态钩子迁到 `--field-*`。
4. 去除 `global.css` 中 shadcn semantic 映射的硬编码 foreground。
5. 建立旧状态 class 违规基线，例如 `border-pri`、`ring-soft`、`bg-pri-soft`。
6. guard 策略先“禁止新增命中”，再在后续切片逐步清零。
7. 禁止未消费 token 批量落地。

验收：

- `tokens.snapshot.test.ts` 覆盖新增 token。
- `pnpm vitest run src/styles/__tests__/tokens.snapshot.test.ts` 通过。
- `global.css` 的低层状态钩子不再绕过组件 token。
- 违规基线可复查，并能阻止新增命中。

### Step 2：Field Family 纵向切片

改动范围：

- `field.tsx`
- `form.tsx`
- `input.tsx`
- `textarea.tsx`
- `native-select.tsx`
- `select.tsx` 的 trigger 部分
- `SearchField.tsx`
- 对应测试

任务：

1. 把 field 类组件改为消费 `--field-*`。
2. open/focus-visible/focus-within/hover/invalid/disabled/readOnly 状态统一。
3. `Field data-invalid` 与控件 `aria-invalid` 合同化。
4. 把 SearchField icon 的显式 size/text class 收敛到组件约束。
5. 对用户管理、菜单管理中表单弹窗做人工验证。

验收：

- Input、Textarea、SelectTrigger、SearchField 在三种 flavor 下状态可区分。
- 点击 Select 弹层外部控件不会误关父 Dialog。
- focus 后背景变化符合设计体系要求。
- invalid 压过 focus/open。

### Step 3：Option Family 切片

改动范围：

- `select.tsx` item/group/content 中的 option 状态
- `dropdown-menu.tsx`
- 后续 Command/Combobox 预留但不强行实现

任务：

1. 选项 hover/highlighted/selected/disabled token 化。
2. 保留 SelectContent 的 Radix 尺寸变量。
3. 补 `SelectGroup` / `DropdownMenuGroup` 组合约束。
4. 不在本步骤改 Dialog outside event。

验收：

- Select option 三态清晰。
- selected + highlighted 同时存在时可读。
- DropdownMenu 未因 `--accent` 语义漂移出现大面积视觉变化。

### Step 4：Overlay Family 切片

改动范围：

- `dialog.tsx`
- `sheet.tsx`
- `popover.tsx`
- `dropdown-menu.tsx`
- `tooltip.tsx`
- `select.tsx` content 部分

任务：

1. Dialog/Sheet close button token 化。
2. SelectContent/Popover/DropdownMenu 的 surface、border、shadow token 化。
3. 保留 Portal、outside event、autoFocus、Escape、Radix CSS variables。
4. 验证嵌套弹层交互。

验收：

- Dialog/Sheet 关闭按钮样式统一。
- 菜单管理弹窗内选择图标、路由等嵌套弹层不误关父弹窗。
- Radix animation 和定位不退化。

### Step 5：Button Family 切片

改动范围：

- `button.tsx`
- Shell/Header icon button 使用点
- Dialog/Sheet close button 使用点
- Table action button 使用点

任务：

1. 全部 Button variants 消费 `--button-*`。
2. 统一 clickable cursor 与 disabled cursor。
3. 保留 loading API 与 `ButtonSpinner`。
4. danger/destructive/danger-ghost 兼容处理。

验收：

- Button 各 variant 在三种 flavor 下视觉合理。
- Header 图标按钮、关闭按钮、表格操作按钮 hover/focus 统一。
- disabled/loading 状态压过 hover/active。

### Step 6：Tabs / Choice / Feedback 切片

改动范围：

- `tabs.tsx`
- `AnimatedTabs.tsx`
- `checkbox.tsx`
- `radio-group.tsx`
- `switch.tsx`
- `badge.tsx`
- `progress.tsx`
- `skeleton.tsx`
- `empty.tsx`
- `alert.tsx`

任务：

1. Tabs active/indicator/focus 消费 `--tabs-*`。
2. Choice 控件消费 `--choice-*`。
3. Feedback 控件消费 `--feedback-*` / `--skeleton-*` / `--empty-*`。
4. 保留 tabs indicator 动画。
5. AnimatedTabs 单独验证 keyboard/aria。

验收：

- Tabs 下划线动画存在且不抖动。
- Checkbox/Radio/Switch focus 和 checked 状态清晰。
- Skeleton/Empty/Badge dark mode 可读。

### Step 7：Table / Pro / Shell / 样板页面切片

改动范围：

- `table.tsx`
- `TableShell.tsx`
- `PageScaffold.tsx`
- `SideList.tsx`
- `Pagination.tsx`
- `AppearanceDrawer.tsx`
- `GlobalSearch.tsx`
- 用户/角色/菜单三个页面的局部样式

任务：

1. 表头、行 hover、selected、expanded 状态 token 化。
2. Pro 组件消费 `--pro-*` / `--side-list-*` / `--shell-*`。
3. 清理典型页面中的重复状态样式。
4. 用户管理、角色管理、菜单管理三条业务线作为样板。

验收：

- 三条样板页面不再手写基础控件状态样式。
- 表格、筛选区、侧栏列表在三种 flavor 下统一。
- 后续新页面能通过组合 Pro 组件获得默认风格。

### Step 8：约束与文档

改动范围：

- `docs/frontend-architecture-guide.md`
- `docs/architecture.md`
- `AGENTS.md` 如需补规则
- 测试或 lint 辅助脚本
- 可选新增 `/dev/theme-states` 状态展示页

任务：

1. 写明新增组件 token 的流程。
2. 写明页面层禁止事项。
3. 增加 grep/测试约束，限制组件里继续直接使用 `border-pri`、`ring-soft` 等状态样式。
4. 增加主题验收 checklist。
5. 建立状态展示页或等效测试夹具，集中展示每个组件族所有关键状态。

验收：

- 文档能指导新人新增组件。
- CI/测试能发现明显 token 违规。
- 状态展示页或等效夹具可用于截图矩阵。

## 12. 验证方案

### 12.1 静态验证

必须检查：

- token 快照测试。
- 禁止新增组件内十六进制色值。
- 禁止新增 `rounded-[Npx]`。
- 禁止基础组件状态直接消费 `border-pri`、`ring-soft`、`bg-pri-soft`。
- `--app-scale` 乘法不被破坏。
- shadcn/Radix 结构和事件合同不被破坏。

建议命令：

```bash
./node_modules/.bin/vitest run src/styles/__tests__/tokens.snapshot.test.ts
rg "border-pri|ring-soft|bg-pri-soft|focus-visible:border-pri" src/components/ui src/components/pro src/app/shell/widgets src/modules/admin/pages
rg "#[0-9a-fA-F]{3,8}" src/components/ui src/components/pro src/app/shell/widgets src/modules/admin/pages src/styles/global.css
```

说明：

- `src/styles/tokens.css` 允许定义原始色值。
- `src/lib/appearance-dom.ts` 可保留用于主题色预设的数据色值，但不能把这些值写入组件 class。
- `global.css` 不应新增硬编码色值；如果现有基线仍有少量映射，必须进入清理清单。

### 12.2 单元测试

覆盖：

- `AppearanceDrawer` 切换 flavor 后 token 状态正确。
- `appearance-dom` 派生 `--pri`、`--pri-soft` 正确。
- 关键组件 class 包含 token 消费。
- invalid/focus/open 状态优先级符合预期。
- Dialog outside click 行为保持当前合同。
- Select/Dropdown 保留 Radix 关键 CSS variables。

### 12.3 浏览器验证

必须验证组合：

```text
flavor: feishu / claude / shadcn
mode: light / dark
scale: 90% / 100% / 108%
radius: sharp / default / round
```

关键页面：

- 登录页
- 用户管理
- 角色管理
- 菜单管理
- 外观设置抽屉
- 可选 `/dev/theme-states`

关键交互：

- Input focus-visible / focus-within / blur / hover
- SearchField focus
- Select open / option highlighted / selected / outside click
- Dialog 内嵌 Select
- Tabs 切换动画
- Table row hover / selected / expanded
- Dialog/Sheet close hover / focus
- Checkbox checked / indeterminate / disabled
- Button loading / disabled / danger

### 12.4 视觉验证

短期：

- 人工截图检查三套 flavor 关键状态。
- 保留至少一组 before/after 截图。
- 对 Field、Option、Button、Tabs、Overlay、Table、Choice、Feedback 输出状态截图。

中期：

- 建 `/dev/theme-states` 或 Story/Preview 页面，集中展示基础组件全状态。
- 用 Agent Browser / Playwright 触发状态并保存截图。
- 对关键元素读取 computed style，验证 token 真实生效。

长期：

- 接入视觉回归 diff。
- 对 token 变化生成审查报告。

### 12.5 样板业务线验证

用户管理：

- 部门侧栏 active/hover。
- tabs active/indicator。
- 筛选区 field/select/button。
- 表格 header/row hover/selected。
- 批量操作条。
- 创建/编辑/详情弹窗。

角色管理：

- 角色列表 active。
- 权限树 checked/indeterminate/expanded。
- 三态按钮。
- 权限 action chips。
- 成员/日志 empty/loading。

菜单管理：

- 子系统卡片 active/hover。
- 树表 expanded/selected。
- 菜单类型 badge。
- 可见性 switch。
- 表单弹窗。
- 嵌套选择弹层。

## 13. 影响范围

### 13.1 高影响文件

- `src/styles/tokens.css`
- `src/styles/global.css`
- `src/components/ui/*`
- `src/components/pro/*`
- `src/styles/__tests__/tokens.snapshot.test.ts`
- `src/components/ui/__tests__/*`
- `src/components/pro/__tests__/*`

### 13.2 中影响文件

- `src/app/shell/widgets/AppearanceDrawer.tsx`
- `src/app/shell/widgets/GlobalSearch.tsx`
- `src/lib/appearance-dom.ts`
- `src/stores/appearance.ts`
- `src/modules/admin/pages/users/*`
- `src/modules/admin/pages/roles/*`
- `src/modules/admin/pages/menus/*`

### 13.3 低影响文件

- locale 文案
- architecture docs
- module boundary tests

### 13.4 风险

| 风险 | 等级 | 处理方式 |
| --- | --- | --- |
| token 数量失控 | 高 | 先按组件族，不按每个组件无限扩散；每族首批超过 24 个必须说明 |
| class 可读性下降 | 中 | 把重复 class 收敛到 cva / helper 常量 |
| Tailwind 任意变量写法导致构建遗漏 | 中 | 优先 `bg-(--token)` 形式，每个切片跑构建和组件测试 |
| 三种 flavor 差异过大导致维护成本高 | 中 | 只允许 token 差异，不允许组件结构差异 |
| 视觉回归覆盖不足 | 中 | 先做关键页面人工矩阵，再补自动化 |
| shadcn 上游更新难合并 | 中 | 保留 open code，更新时用 shadcn CLI diff，不 overwrite |
| Pro 组件与 UI token 边界模糊 | 高 | Pro token 只表达业务组合，不重新定义基础控件状态 |
| Radix 事件合同被样式改造破坏 | 高 | Dialog/Select/Popover 行为必须有测试和浏览器验证 |
| `--accent` 语义调整造成未迁移组件漂移 | 高 | Step 1 不贸然改，随 Option/Menu 切片迁移 |
| Portal token 继承失败 | 高 | token 定义在 `:root` / `html[data-*]` |

## 14. 完成定义

本主题深化工程完成时，必须满足：

1. 三种 flavor 都有完整基础状态 token。
2. Field、Option、Button、Tabs、Overlay、Table、Choice、Feedback、Pro/Shell 组件族均已 token 化。
3. 用户、角色、菜单三条样板业务线基本不再手写基础控件状态样式。
4. 状态优先级合同有测试覆盖。
5. Dialog/Select/Popover 等 Radix 行为没有退化。
6. `pnpm vitest run` 通过。
7. `./node_modules/.bin/tsc -b --noEmit` 通过。
8. `./node_modules/.bin/eslint src` 通过。
9. 浏览器验证矩阵完成。
10. 文档更新完成。

## 15. 实施纪律

1. 每个切片单独提交，不混改。
2. 每个切片先补 token 和测试，再改组件。
3. 不允许因为某个页面不好看就直接在页面里堆 class。
4. 不允许为了快速完成把组件逻辑从 Radix/shadcn 改成自写。
5. 不允许用 `!important` 解决状态优先级，除非有明确说明和测试。
6. 不允许用 CSS `zoom`。
7. 不允许在生产组件里写十六进制色值。
8. 不允许在业务页面里新增基础控件视觉状态逻辑。
9. 不允许在实现中跳过样板业务线验证。
10. 不允许把 shadcn 官方结构当作黑盒覆盖；改动必须可 diff、可回滚。

## 16. 对抗性审查记录

### 16.1 架构可维护性审查

结论：方向可行，但初稿分层不够可执行，必须从“Component Tokens + State Tokens”改成“UI Component State Tokens”，并补依赖矩阵。

已吸收：

- 增加分层依赖矩阵。
- 明确 `State Tokens` 不作为独立层。
- Step 1 前置 `.ui-field` 全局状态钩子迁移。
- Step 1 前置违规基线和“禁止新增命中” guard。
- 避免 Pro Table token 与 UI Table token 重复。
- 增加 Shell/Nav 层。
- 增加 token 数量预算。
- 修正静态 grep：`tokens.css` 允许原始色值，组件与 `global.css` 不允许新增硬编码色值。

### 16.2 shadcn / Radix 组件约束审查

结论：token 化不冲突，但必须硬性保护 Radix 结构、Portal、事件和 CSS variables。

已吸收：

- 新增 shadcn/Radix 硬约束章节。
- 明确不改 `DialogContent` outside click 行为。
- 明确 Portal token 必须在 `:root` / `html[data-*]`。
- 明确保留 Radix CSS variables 和 `data-state/data-side/data-align`。
- Field Family 加入 `field.tsx`、`form.tsx`。
- Button Family 补齐全部现有 variants。
- Checkbox 标注为 native input，不假设 Radix API。
- `bg-[var(--token)]` 改为优先 `bg-(--token)`。
- 谨慎处理 `--accent`，避免未迁移组件视觉漂移。

### 16.3 视觉与验证审查

结论：初稿的视觉策略还不够可验收，必须把 flavor 差异、状态优先级和截图/计算样式矩阵写清楚。

已吸收：

- 增加状态优先级合同。
- 扩展状态清单：`focus-visible`、`focus-within`、`highlighted`、`expanded`、`pressed`、`current`、`indeterminate`、`skeleton`、`empty`。
- 增加最小可执行差异矩阵。
- 增加 `/dev/theme-states` 或等效夹具建议。
- 浏览器验证扩展到三种 flavor、light/dark、90/100/108 显示比例、圆角档位。
- 样板业务线细化到用户管理、角色管理、菜单管理的具体状态。

## 17. 后续实施顺序建议

建议按以下顺序进入编码：

1. Step 1：先做 token 合同、全局状态钩子和违规基线。
2. Step 2：做 Field Family，因为当前用户已明确指出 focus、背景、SelectTrigger 问题。
3. Step 4：紧接 Overlay Family，修复 Dialog 内 Select 嵌套交互和 close button 统一。
4. Step 3 / Step 5：Option 与 Button 可以并行，但落地时分提交。
5. Step 6 / Step 7：最后做 Tabs、Choice、Feedback、Table、Pro/Shell 与样板页面收敛。

如果时间有限，第一阶段最小闭环是 Step 1 + Step 2 + Step 4 + 菜单管理弹窗浏览器验证。这样能先解决当前最明显的体验问题，同时不破坏后续体系化建设。
