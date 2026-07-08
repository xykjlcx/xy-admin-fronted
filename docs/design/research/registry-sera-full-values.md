# shadcn 官方 registry — base-sera / base-nova 十二组件展平源码值表

- 抓取日期:2026-07-08
- 端点模式:`https://ui.shadcn.com/r/styles/{style}/{component}.json`(取 `files[].content` 中的 tsx 源码)
- styles:`base-sera`(移植目标)、`base-nova`(对照基准列)
- components:`button`、`input`、`textarea`、`label`、`table`、`select`、`checkbox`、`radio-group`、`switch`、`tabs`、`dialog`、`dropdown-menu`
- 抓取结果:**24/24 实抓成功,无缺失项**。全部为一手数据,`base-sera` 完整源码见文末各节引用块。
- 说明:`base-*` 是 shadcn 官方 registry 内部风格代号,与本仓库 flavor(`feishu`/`claude`/`shadcn`/未来 `sera`)命名**无对应关系**,本文档不做映射,只呈现原始抓取值。`base-nova` 只作对照基准列,原文不贴(与本目录已有的 `registry-badge-card-values.md` 体例一致)。

---

## 一、Button 对照表

| 维度 | base-nova | base-sera |
|---|---|---|
| 圆角 | `rounded-lg`(尺寸变体另有 `rounded-[min(var(--radius-md),10-12px)]` 精修) | `rounded-none`(全部尺寸变体均无圆角覆写) |
| 字号 | `text-sm`(xs 降 `text-xs`,sm 降 `text-[0.8rem]`) | `text-xs`(所有尺寸统一,无按 size 降级) |
| 字重 | `font-medium` | `font-semibold` |
| text-transform | 无 | `uppercase` |
| letter-spacing | 无 | `tracking-widest` |
| 边框 | `border border-transparent`(outline variant 用 `border-border` + `dark:border-input`) | `border border-transparent`(outline variant 用 `border-border`,无 dark:border-input) |
| focus 反馈 | `focus-visible:border-ring focus-visible:ring-3 ring-ring/50` | `focus-visible:border-ring focus-visible:ring-2 ring-ring/30`(环更窄、更淡) |
| active 反馈 | `active:not-aria-[haspopup]:translate-y-px` | 同左(两者一致,均有按下位移) |
| 默认高度(size=default) | `h-8`,`px-2.5`,`gap-1.5` | `h-10`,`px-6`,`gap-1.5`(整体更高更宽) |
| 尺寸序列 | xs `h-6` / sm `h-7` / default `h-8` / lg `h-9` | xs `h-7` / sm `h-9` / default `h-10` / lg `h-11` |
| icon 尺寸 | 默认 `size-4`(xs/sm 降 `size-3`/`size-3.5`) | 默认 `size-3.5`(xs 降 `size-3`,其余不再降级) |
| variant=outline 背景 | `bg-background dark:border-input dark:bg-input/30` | `bg-transparent`(无 dark:border-input,`dark:hover:bg-input/30` 仅在 hover) |
| variant=secondary/destructive/ghost/link | 与 sera 结构一致(仅颜色 token 相同、无量差异) | 同左 |
| 阴影 | 无 shadow class(纯 ring/border) | 无 shadow class |

**关键分歧**:sera 按钮走"直角 + uppercase + tracking-widest + 更细 focus ring"的印刷体标签语言,且整体尺寸(h-10 起步)比 nova(h-8 起步)大一档,但内部图标反而更小(3.5 vs 4),形成"大框小图标"的疏朗版式。nova 按尺寸变体做圆角精修(`rounded-[min(...)]`),sera 完全不做圆角覆写(因为基线就是 0)。

---

## 二、Input 对照表

| 维度 | base-nova | base-sera |
|---|---|---|
| 高度 | `h-8` | `h-10` |
| 水平 padding | `px-2.5` | `px-0`(**无水平内距**) |
| 垂直 padding | `py-1` | `py-1` |
| 圆角 | `rounded-lg` | 无 rounded class(方形,因边框策略已是下划线不需要圆角) |
| 字号 | `text-base`(`md:text-sm`) | `text-base`(`md:text-sm`,相同) |
| 边框策略 | **全框**:`border border-input` | **仅下边框**:`border border-transparent border-b-input`(顶/左/右透明,只有底边着色——传闻属实) |
| 背景 | `bg-transparent`(`dark:bg-input/30`) | `bg-transparent`(无 dark 差异化背景) |
| focus 反馈 | `focus-visible:border-ring focus-visible:ring-3 ring-ring/50`(边框全色 + 环) | `focus-visible:border-b-ring`(**无 ring**,仅底边变色) |
| disabled | `disabled:bg-input/50 disabled:opacity-50` | `disabled:opacity-50`(无背景态变化) |
| aria-invalid | `border-destructive ring-3 ring-destructive/20` | `border-b-destructive`(仍只作用底边,无 ring) |
| file input 内联样式 | `file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium` | `file:h-7`(其余相同) |

**关键分歧**:sera input 是彻底的"底线输入框"设计——边框结构性保留 `border`(四边),但三边设为 `transparent`,只有 `border-b-input` 着色;focus/invalid 态也只变底边颜色,完全不使用 ring。这是与 nova(全框 + ring)最大分野的组件。

---

## 三、Textarea 对照表

| 维度 | base-nova | base-sera |
|---|---|---|
| 圆角 | `rounded-lg` | 无 rounded class(方形) |
| 边框策略 | `border border-input`(全框) | `border border-transparent border-b-input`(仅底边,与 input 一致) |
| 垂直 padding | `py-2` | `py-3` |
| 水平 padding | `px-2.5` | `px-0` |
| focus 反馈 | `focus-visible:border-ring focus-visible:ring-3 ring-ring/50` | `focus-visible:border-b-ring`(无 ring) |
| disabled | `disabled:bg-input/50 disabled:opacity-50` | `disabled:opacity-50` |
| aria-invalid | `border-destructive ring-3 ring-destructive/20` | `border-b-destructive` |
| 最小高度 | `min-h-16`(相同) | `min-h-16` |

**关键分歧**:与 input 完全同构——底边线策略 + 无 ring 的 focus 反馈,是 sera 表单控件的统一签名。

---

## 四、Label 对照表

| 维度 | base-nova | base-sera |
|---|---|---|
| 字号 | `text-sm leading-none` | `text-xs`(无 leading-none) |
| 字重 | `font-medium` | `font-semibold` |
| text-transform | 无 | `uppercase` |
| letter-spacing | 无 | `tracking-wide` |
| 豁免机制 | 无(nova 没有 peer 联动的排印覆写) | **有**:当 label 的 peer 是 `checkbox`/`radio-group-item`/`switch` 时,通过 `peer-data-[slot=xxx]:text-sm peer-data-[slot=xxx]:font-normal peer-data-[slot=xxx]:tracking-normal peer-data-[slot=xxx]:normal-case` 四条一起把 uppercase+tracking-wide+font-semibold+text-xs 全部撤销,退回 `text-sm font-normal normal-case` |
| disabled 联动 | `group-data-[disabled=true]:opacity-50` `peer-disabled:opacity-50` | 相同 |

**关键分歧**:sera label 默认是 uppercase + tracking-wide + semibold 的"标签体"排印,但传闻中的"normal-case 豁免"确认存在——专门为搭配 checkbox/radio/switch 的行内说明文字(而非独立字段标签)退回常规大小写和字重,避免"勾选框旁边的一句话文字"也变成全大写。这是本次抓取中最精细的一条条件化规则。

---

## 五、Table 对照表

| 维度 | base-nova | base-sera |
|---|---|---|
| 表头高度 | `h-10` | `h-12` |
| 表头水平 padding | `px-2` | `px-3` |
| 表头字号 | 未显式设(继承 `text-sm`,无 `text-xs`) | `text-xs` |
| 表头字重 | `font-medium` | `font-medium`(相同) |
| 表头 text-transform | 无 | `uppercase` |
| 表头 letter-spacing | 无 | `tracking-wider` |
| 表头文字色 | `text-foreground` | `text-muted-foreground`(更淡) |
| 数据行 cell padding | `p-2` | `p-3` |
| Table/TableHeader/TableBody/TableFooter/TableRow 结构类 | `border-b`、`hover:bg-muted/50`、`data-[state=selected]:bg-muted` 等 | 与 nova **逐字节相同**,无差异 |
| TableCaption | `mt-4 text-sm text-muted-foreground` | 相同 |

**关键分歧**:table 组件本身的行为类(边框、hover、选中态)两个 style 完全一致,唯一差异集中在 `TableHead`(表头)——sera 表头更高(h-12 vs h-10)、更宽 padding(px-3/p-3 vs px-2/p-2),且叠加 uppercase + tracking-wider + 弱化文字色,构成与其它组件一致的"大写小字号标签"表头范式;数据 cell 本身字号/颜色不变,只有 padding 加大。

---

## 六、Select 对照表

| 维度 | base-nova | base-sera |
|---|---|---|
| Trigger 高度 | default `h-8` / sm `h-7` | default `h-10` / sm `h-9` |
| Trigger 圆角 | `rounded-lg`(sm 另降 `rounded-[min(var(--radius-md),10px)]`) | 无 rounded class(方形) |
| Trigger 边框策略 | `border border-input`(全框) | `border border-transparent border-b-input`(仅底边,与 input/textarea 同构) |
| Trigger padding | `py-2 pr-2 pl-2.5` | `px-0 py-2`(无水平内距) |
| Trigger focus | `focus-visible:border-ring ring-3 ring-ring/50` | `focus-visible:border-b-ring`(无 ring) |
| Trigger icon 尺寸 | `size-4` | `size-3.5` |
| Content 圆角 | `rounded-lg` | `rounded-none` |
| Content 阴影/环 | `shadow-md ring-1 ring-foreground/10` | 相同(`shadow-md ring-1 ring-foreground/10`) |
| Content min-width | `min-w-36` | `min-w-36`(相同) |
| Group scroll padding | `scroll-my-1 p-1` | `scroll-my-1.5 p-1.5` |
| SelectLabel | `px-1.5 py-1 text-xs text-muted-foreground`(无 transform) | `px-3 py-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground` |
| SelectItem 圆角/padding | `rounded-md py-1 pr-8 pl-1.5 text-sm` | `rounded-none py-2 pr-8 pl-3 text-sm`(item 本身不 uppercase,仅 Label 是) |
| SelectSeparator | `-mx-1 my-1 h-px bg-border` | `-mx-1.5 my-1.5 h-px bg-border/50`(更淡) |
| ScrollUp/Down icon | `size-4` | `size-3.5` |

**关键分歧**:Select 的 Trigger 与 input/textarea 完全同构(底边线策略、无 ring focus、无水平内距),但下拉出来的 Content/Item 走的是与 dropdown-menu 一致的"弹层"策略(仍保留 rounded-none + shadow-md + ring,内距更松、SelectLabel 走 uppercase+tracking-wider)。即:**触发器走"field 族"直角底线语言,弹层走"menu 族"直角浮层语言**,两条语言在同一组件内共存但服务不同部分。

---

## 七、Checkbox 对照表

| 维度 | base-nova | base-sera |
|---|---|---|
| 尺寸 | `size-4`(16px) | `size-4.5`(18px,略大) |
| 形状(圆角) | `rounded-[4px]` | `rounded-none`(直角方形) |
| 边框 | `border border-input` | `border border-input`(相同) |
| 背景(未选中) | `dark:bg-input/30`(暗色有底色) | 无背景差异化(`bg-transparent`) |
| focus 反馈 | `ring-3 ring-ring/50` | `ring-2 ring-ring/30`(更窄更淡,与 button/其他控件一致) |
| 选中态 | `data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary` | 相同(`data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary`) |
| indicator 图标尺寸 | `size-3.5` | `size-3.5`(相同) |

**关键分歧**:选中态填充逻辑完全一致(实心 primary 方块),差异只在形状(直角 vs 4px 圆角)、尺寸(18 vs 16)与 focus ring 宽度。checkbox 是所有控件里选中态色彩逻辑与 nova 最接近的一个。

---

## 八、Radio Group 对照表

| 维度 | base-nova | base-sera |
|---|---|---|
| Group 间距 | `gap-2` | `gap-3` |
| Item 尺寸 | `size-4` | `size-4.5` |
| Item 形状 | `rounded-full`(相同,两者都是圆形) | `rounded-full`(radio 是唯一两 style 都不直角化的控件) |
| Item 背景(未选中) | `dark:bg-input/30` | 无(`bg-transparent`) |
| focus 反馈 | `ring-3 ring-ring/50` | `ring-2 ring-ring/30` |
| **选中态填充** | `data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary`(**实心圆,primary 底色**) | `data-checked:border-foreground`(**仅描边变色,无背景填充**) |
| 内部圆点(indicator) | `bg-primary-foreground`(在 primary 底色上做对比色小圆点) | `bg-foreground`(在透明底上直接用前景色小圆点) |

**关键分歧**:这是本次抓取发现的最大结构性分歧——nova 的 radio 选中态是"实心填充 primary + 反色圆点"(类似 checkbox 的填充逻辑),而 sera 的 radio 选中态**完全不填充背景**,仅把边框和内部圆点都变成 `foreground` 色,呈现"空心描边 + 前景色圆点"的极简形态。radio 是唯一在"是否保留圆形"上两个 style 一致、但在"选中态是否填充色块"上分道扬镳的控件。

---

## 九、Switch 对照表

| 维度 | base-nova | base-sera |
|---|---|---|
| 轨道形状 | `rounded-full` | `rounded-none`(方形轨道) |
| 轨道边框 | `border border-transparent`(无描边,靠背景色区分) | `border`(**保留描边**,未选中 `data-unchecked:border-input/50`,选中 `data-checked:border-primary`) |
| 轨道尺寸(default) | `h-[18.4px] w-[32px]` | `h-4.5 w-8.25`(≈ h-18px w-33px,量级接近但用 spacing token 而非任意 px) |
| 轨道尺寸(sm) | `h-[14px] w-[24px]` | `h-3.5 w-6.25` |
| focus 反馈 | `ring-3 ring-ring/50` | `ring-2 ring-ring/30` |
| 未选中背景 | `bg-input`(`dark:bg-input/80`) | `bg-input`(无 dark 差异化) |
| 选中背景 | `data-checked:bg-primary` | `data-checked:bg-primary`(相同) |
| Thumb 形状 | `rounded-full` | **无 rounded class**(方形滑块,随轨道直角化贯彻到底) |
| Thumb 尺寸(default/sm) | `size-4` / `size-3` | `size-3.5` / `size-2.5` |
| Thumb 位移(选中) | `translate-x-[calc(100%-2px)]` | `translate-x-[calc(100%+2px)]`(符号相反,因轨道有边框需要外扩以对齐视觉留白) |
| Thumb 未选中位移 | `translate-x-0` | `translate-x-0.25` |

**关键分歧**:switch 是 sera "直角贯彻"最彻底的控件——连带轨道自身描边策略也变了(nova 无边框靠色块区分,sera 有边框且选中/未选中边框色不同),thumb 从圆形变方形,尺寸全线缩小一档(与 checkbox "尺寸变大"的方向相反,switch 反而更紧凑)。

---

## 十、Tabs 对照表

| 维度 | base-nova | base-sera |
|---|---|---|
| Tabs 根容器 | `flex gap-2` | 相同 |
| TabsList 高度 | `h-8`(横向) | `h-10` |
| TabsList 圆角 | `rounded-lg`(`data-[variant=line]:rounded-none`) | 无 rounded class(default variant 本身就方形) |
| TabsList padding | `p-[3px]` | `p-1` |
| TabsTrigger 圆角 | `rounded-md` | 无 rounded class(方形) |
| TabsTrigger padding | `px-1.5 py-0.5` | `px-4 py-1.5`(横向内距明显更松) |
| TabsTrigger 字号 | `text-sm` | `text-xs` |
| TabsTrigger 字重 | `font-medium` | `font-semibold` |
| TabsTrigger transform | 无 | `uppercase` |
| TabsTrigger tracking | 无 | `tracking-wider` |
| TabsTrigger gap | `gap-1.5` | `gap-2` |
| TabsTrigger icon 尺寸 | `size-4` | `size-3.5` |
| **激活态(default variant)阴影** | `group-data-[variant=default]/tabs-list:data-active:shadow-sm`(**有**投影,营造"浮起的卡片"感) | 无此 class(**无阴影**,激活态仅靠 `bg-background` 换色 + `dark:border-input dark:bg-input/30`) |
| line variant 底部横杠机制 | `after:absolute after:bg-foreground ... group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 ...` | **逐字节相同**(两 style 共用同一套 after 伪元素下划线机制) |
| TabsContent | `flex-1 text-sm outline-none` | 相同 |

**关键分歧**:default variant 下,nova 的激活 tab 靠 `shadow-sm` 做"浮起"提示,sera 完全去掉阴影,只靠背景色对比 + uppercase 大写强调;line variant 的下划线动画机制两者完全共用同一段代码,说明 sera 在"line 变体"上没有做二次定制,分歧集中在 default 变体的视觉语言(有阴影 vs 纯扁平)。

---

## 十一、Dialog 对照表

| 维度 | base-nova | base-sera |
|---|---|---|
| Overlay 背景 | `bg-black/10` | `bg-black/20`(更深) |
| Overlay 模糊 | `backdrop-blur-xs` | `backdrop-blur-sm`(更强) |
| Content 圆角 | `rounded-xl` | `rounded-none` |
| Content 内距 | `p-4`,`gap-4` | `p-6`,`gap-6`(更松) |
| Content 阴影 | 无 shadow class(仅 `ring-1 ring-foreground/10`) | `shadow-md`(**额外带阴影**,与 ring 叠加) |
| Content 最大宽度 | `sm:max-w-sm` | `sm:max-w-md`(更宽一档) |
| Title 字号 | `text-base` | `text-lg` |
| Title 字重 | `font-medium` | `font-semibold` |
| Title transform | 无 | `uppercase` |
| Title tracking | 无 | `tracking-wider` |
| Title 字体族 | `cn-font-heading`(相同) | `cn-font-heading` |
| Description | `text-sm text-muted-foreground`,无上边距 | `mt-0.5 text-sm leading-relaxed text-muted-foreground`(多一点顶部间距和放松行高) |
| Footer 结构 | `-mx-4 -mb-4 ... border-t bg-muted/50 p-4 ...`(**footer 自带分隔线+灰底,负边距贴边形成独立"操作栏"**) | `flex flex-col-reverse gap-2 sm:flex-row sm:justify-end`(**无边框、无灰底、无负边距**,footer 与正文视觉上是同一块) |
| Close 按钮位置 | `absolute top-2 right-2`,无背景覆写 | `absolute top-5 right-5 bg-secondary`(带底色方块,位置随更大内距下移) |

**关键分歧**:sera dialog 走"更大内距 + 直角 + uppercase 标题 + 独立 shadow-md"的厚重卡片语言,而 footer 恰好相反——nova 把 footer 做成有分隔线的独立操作栏(视觉上"切开"),sera 的 footer 完全融入正文,不做视觉分区。这与 Card 组件里 sera CardFooter 默认无边框的结论(见 `registry-badge-card-values.md`)一致,是跨组件重复出现的模式。

---

## 十二、Dropdown Menu 对照表

| 维度 | base-nova | base-sera |
|---|---|---|
| Content 圆角 | `rounded-lg` | `rounded-none` |
| Content padding | `p-1` | `p-1.5` |
| Content min-width | `min-w-32` | `min-w-48`(明显更宽) |
| Content 阴影/环 | `shadow-md ring-1 ring-foreground/10`(相同) | 相同 |
| Label padding | `px-1.5 py-1` | `px-3 py-2` |
| Label 字重/transform | `font-medium`,无 transform | `font-semibold tracking-wider uppercase` |
| Item 圆角 | `rounded-md` | `rounded-none` |
| Item padding | `px-1.5 py-1` | `px-3 py-2` |
| Item 字号 | `text-sm` | `text-xs` |
| Item 字重/transform | 无显式 font-weight class(继承常规),无 transform | `font-medium tracking-wider uppercase` |
| Item gap | `gap-1.5` | `gap-2.5` |
| Item icon 尺寸 | `size-4` | `size-3.5` |
| SubTrigger | 与 Item 同构差异(rounded-md vs rounded-none、px-1.5 py-1 vs px-3 py-2、无 transform vs uppercase) | 同上 |
| SubContent 圆角 | `rounded-lg` | `rounded-none` |
| SubContent 阴影 | `shadow-lg`(比主 Content 的 `shadow-md` 更重) | `shadow-md`(与主 Content 一致,无额外加重) |
| SubContent min-width | `min-w-[96px]` | `min-w-36` |
| CheckboxItem/RadioItem | `rounded-md py-1 pr-8 pl-1.5 text-sm`(无 transform) | `rounded-none py-2 pr-8 pl-3 text-xs font-medium tracking-wider uppercase` |
| Separator | `bg-border`(`-mx-1 my-1`) | `bg-border/50`(`-mx-1.5 my-1.5`,更淡更松) |
| Shortcut | `ml-auto text-xs tracking-widest text-muted-foreground ...` | **逐字节相同** |

**关键分歧**:dropdown-menu 与 dropdown 内的 Select Content 一样走"直角浮层"语言,所有可点击项(Item/SubTrigger/CheckboxItem/RadioItem)统一套上 uppercase + tracking-wider + text-xs,只有 Shortcut(键盘快捷键提示文字)例外——两个 style 的 Shortcut class 完全相同,说明这条辅助文字不参与"uppercase 标签化"的整体改造。

---

## 十三、sera 横切规律(仅归纳数据可见的模式,不做设计建议)

1. **uppercase + letter-spacing 覆盖面**:Button、Label(默认态)、Table 表头、Select 的 SelectLabel、Dialog Title、Tabs Trigger、Dropdown Menu 的 Label/Item/SubTrigger/CheckboxItem/RadioItem —— 12 个组件中有 7 个(Button/Label/Table/Select/Tabs/Dialog/Dropdown-menu)的至少一个部位带 `uppercase`。**未出现 uppercase 的组件**:Input、Textarea、Checkbox、Radio Group、Switch(纯表单交互控件,不含文字标签部分)。
2. **tracking 档位**:实测出现三档,按字号从小到大对应:`tracking-widest`(Button 主文案 `text-xs`、Dropdown Menu Shortcut `text-xs`)> `tracking-wider`(Table 表头/Select Label/Dialog Title/Tabs Trigger/Dropdown Menu 各 Label 与 Item,均 `text-xs`~`text-lg` 不等)> `tracking-wide`(仅 Label 组件默认态,`text-xs`)。未发现与字号严格线性对应的规律,widest 只出现在 Button 和 Shortcut 两处。
3. **无 ring 的 focus 替代形态**:仅出现在**底边线策略**的三个组件——Input、Textarea、Select Trigger,统一用 `focus-visible:border-b-ring` 替代 ring。其余所有组件(Button/Checkbox/Radio/Switch)**仍保留 ring**,只是宽度从 nova 的 `ring-3`/`ring-[3px]` 收窄到 `ring-2`,不透明度从 `/50` 降到 `/30`。即:**"无 ring"不是 sera 的全局规则,只是"底边线族"(input/textarea/select-trigger)的专属特征**;其它控件类(button/checkbox/radio/switch)保留 ring 机制,只做量的收窄。
4. **直角贯彻度**:`rounded-none` 覆盖 Button、Input(隐式无 rounded class)、Textarea(同)、Table(本就无 rounded)、Select(Trigger + Content + Item)、Checkbox、Switch(轨道+滑块)、Tabs(List + Trigger)、Dialog(Content)、Dropdown Menu(Content + Item + SubContent)——**11/12 组件的可视边框元素都是直角**。唯一例外是 **Radio Group**(`rounded-full` 保留,两个 style 均为圆形),是本次抓取里唯一"形状与 nova 一致、只在填色逻辑上分道"的控件。
5. **边框策略族群**:表单输入类(Input/Textarea/Select Trigger)统一收窄为"仅底边着色,其余三边 transparent";按钮/复选/单选/开关类保留全框结构(`border` 四边同权,靠 variant/data-state 切换颜色);弹层类(Select Content/Dropdown Menu Content/Dialog Content)保持 `ring-1 ring-foreground/10` 而非 `border`。三条边框语言在 12 个组件间清晰分层,没有交叉。
6. **填色 vs 描边的选中态分歧**:Checkbox 选中态是实心填充(`bg-primary`),Radio Group 选中态是空心描边(仅 `border-foreground` + 前景色圆点,无 `bg-primary`),Switch 选中态是实心填充(`bg-primary`)——三个"二元选择"控件里,唯独 Radio Group 不填充背景色,与 nova 在该点保持一致方向(nova 三者都填充)形成反差,是本次抓取发现的最大结构性分歧点。
7. **阴影出现位置不规则**:Dialog Content 带 `shadow-md`(nova 该处反而没有 shadow,只有 ring);Select Content / Dropdown Menu Content 带 `shadow-md`(与 nova 相同);Dropdown Menu SubContent 是 `shadow-md`(nova 该处是更重的 `shadow-lg`);Tabs 激活态**没有** `shadow-sm`(nova 有)。阴影不是"sera 更重"或"sera 更轻"的单向规律,而是逐组件独立决定。
8. **尺寸(size)方向不统一**:Button/Input/Textarea/Select/Table/Tabs/Dialog 的高度或内距普遍比 nova**更大**(如 Button h-10 vs h-8,Table 表头 h-12 vs h-10,Dialog p-6 vs p-4);但 Checkbox(4.5 vs 4,小幅变大)与 Switch(轨道/滑块尺寸普遍**更小**一档,thumb size-3.5 vs size-4)方向相反,不能一概而论"sera 更疏朗"。
9. **peer 联动排印豁免仅见于 Label**:12 个组件中只有 Label 存在"根据搭配的兄弟控件类型,有条件撤销自身 uppercase/tracking/font-weight"的机制(针对 checkbox/radio-group-item/switch 三种 peer),其余组件未发现类似的条件化排印撤销逻辑。
10. **辅助性小字文本不参与大写化**:Dropdown Menu 的 `DropdownMenuShortcut`(键盘快捷键提示)在 sera 与 nova 中 class **逐字节相同**,未被纳入 uppercase/tracking 改造;Tabs 的 line-variant 下划线动画机制、Table 的行为类(hover/selected/border)、Select 的 Item 文本本身(非 Label)也都在两个 style 间保持一致或仅有极小改动,说明 sera 的改造集中在"标签/表头/触发文案"一类结构性文字,不触碰纯功能性的行为类与提示性小字。

---

## 十四、base-sera 完整源码引用(裁剪到组件定义部分)

### base-sera / button.tsx
```tsx
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-semibold tracking-widest whitespace-nowrap uppercase transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-transparent hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-input/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-11 gap-1.5 px-8 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)
```

### base-sera / input.tsx
```tsx
"h-10 w-full min-w-0 border border-transparent border-b-input bg-transparent px-0 py-1 text-base transition-[color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-b-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-b-destructive md:text-sm dark:aria-invalid:border-b-destructive/50"
```

### base-sera / textarea.tsx
```tsx
"flex field-sizing-content min-h-16 w-full resize-none rounded-none border border-transparent border-b-input bg-transparent px-0 py-3 text-base transition-[color,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-b-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-b-destructive md:text-sm dark:aria-invalid:border-b-destructive/50"
```

### base-sera / label.tsx
```tsx
"flex items-center gap-2 text-xs font-semibold tracking-wide uppercase select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-data-[slot=checkbox]:text-sm peer-data-[slot=checkbox]:font-normal peer-data-[slot=checkbox]:tracking-normal peer-data-[slot=checkbox]:normal-case peer-data-[slot=radio-group-item]:text-sm peer-data-[slot=radio-group-item]:font-normal peer-data-[slot=radio-group-item]:tracking-normal peer-data-[slot=radio-group-item]:normal-case peer-data-[slot=switch]:text-sm peer-data-[slot=switch]:font-normal peer-data-[slot=switch]:tracking-normal peer-data-[slot=switch]:normal-case"
```

### base-sera / table.tsx(仅列有差异的部分)
```tsx
// TableHead
"h-12 px-3 text-left align-middle text-xs font-medium tracking-wider whitespace-nowrap text-muted-foreground uppercase [&:has([role=checkbox])]:pr-0"
// TableCell
"p-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0"
```

### base-sera / select.tsx(节选)
```tsx
// SelectTrigger
"flex w-fit items-center justify-between gap-1.5 rounded-none border border-transparent border-b-input bg-transparent px-0 py-2 text-sm whitespace-nowrap transition-[color,border-color] outline-none focus-visible:border-b-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-b-destructive data-placeholder:text-muted-foreground data-[size=default]:h-10 data-[size=sm]:h-9 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:aria-invalid:border-b-destructive/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"
// SelectContent (Popup)
"cn-menu-target cn-menu-translucent relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-none bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 ..."
// SelectLabel
"px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
// SelectItem
"relative flex w-full cursor-default items-center gap-2.5 rounded-none py-2 pr-8 pl-3 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground ..."
// SelectSeparator
"pointer-events-none -mx-1.5 my-1.5 h-px bg-border/50"
```

### base-sera / checkbox.tsx
```tsx
"peer relative flex size-4.5 shrink-0 items-center justify-center rounded-none border border-input bg-transparent transition-shadow outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary"
```

### base-sera / radio-group.tsx
```tsx
// RadioGroup
"grid w-full gap-3"
// RadioGroupItem
"group/radio-group-item peer relative flex aspect-square size-4.5 shrink-0 rounded-full border border-input bg-transparent outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-foreground dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-foreground"
// RadioGroupIndicator inner dot
"absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
```

### base-sera / switch.tsx
```tsx
// SwitchRoot
"peer group/switch relative inline-flex shrink-0 items-center rounded-none border transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-[size=default]:h-4.5 data-[size=default]:w-8.25 data-[size=sm]:h-3.5 data-[size=sm]:w-6.25 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-unchecked:border-input/50 data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:opacity-50"
// SwitchThumb
"pointer-events-none block bg-background ring-0 transition-transform group-data-[size=default]/switch:size-3.5 group-data-[size=sm]/switch:size-2.5 data-checked:translate-x-[calc(100%+2px)] dark:data-checked:bg-primary-foreground data-unchecked:translate-x-0.25 dark:data-unchecked:bg-foreground"
```

### base-sera / tabs.tsx(节选)
```tsx
// tabsListVariants
"group/tabs-list inline-flex w-fit items-center justify-center p-1 text-muted-foreground group-data-horizontal/tabs:h-10 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col"
// variants: default "bg-muted", line "gap-1 bg-transparent"
// TabsTrigger
"relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-2 border border-transparent px-4 py-1.5 text-xs font-semibold tracking-wider whitespace-nowrap text-foreground/60 uppercase transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:px-4 group-data-vertical/tabs:py-2 hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5"
// active state
"data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground"
```

### base-sera / dialog.tsx(节选)
```tsx
// DialogOverlay
"fixed inset-0 isolate z-50 bg-black/20 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
// DialogContent (Popup)
"fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-none bg-popover p-6 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
// DialogFooter
"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
// DialogTitle
"cn-font-heading text-lg leading-none font-semibold tracking-wider uppercase"
// DialogDescription
"mt-0.5 text-sm leading-relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground"
// Close button override
"absolute top-5 right-5 bg-secondary" // variant="ghost" size="icon-sm"
```

### base-sera / dropdown-menu.tsx(节选)
```tsx
// DropdownMenuContent (Popup)
"cn-menu-target cn-menu-translucent z-50 max-h-(--available-height) w-(--anchor-width) min-w-48 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-none bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 ..."
// DropdownMenuLabel
"px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase data-inset:pl-9.5"
// DropdownMenuItem
"group/dropdown-menu-item relative flex cursor-default items-center gap-2.5 rounded-none px-3 py-2 text-xs font-medium tracking-wider uppercase outline-hidden select-none focus:bg-accent focus:text-accent-foreground ... data-inset:pl-9.5 data-[variant=destructive]:text-destructive ..."
// DropdownMenuSubTrigger
"flex cursor-default items-center gap-2 rounded-none px-3 py-2 text-xs font-medium tracking-wider uppercase outline-hidden select-none ..."
// DropdownMenuSubContent
"cn-menu-target cn-menu-translucent w-auto min-w-36 rounded-none bg-popover p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 ..."
// DropdownMenuCheckboxItem / DropdownMenuRadioItem
"relative flex cursor-default items-center gap-2.5 rounded-none py-2 pr-8 pl-3 text-xs font-medium tracking-wider uppercase outline-hidden select-none ..."
// DropdownMenuSeparator
"-mx-1.5 my-1.5 h-px bg-border/50"
// DropdownMenuShortcut(与 nova 相同)
"ml-auto text-xs tracking-widest text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground"
```
