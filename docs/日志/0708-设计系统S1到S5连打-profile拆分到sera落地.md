# 0708 设计系统 S1→S5 连打 —— profile 拆分到 sera 第四风格落地

> 接上午 table 密度切片。下午基于 PRD 全面盘点剩余工作,洋哥拍板「机制+挂点优先」路线与「连打模式」,一个下午把 S1(profile 文件化)→ S2(contract 守卫)→ S3(badge 挂点)→ S4(Card 原语)→ S5(sera 第四风格)全部落地并 push。21 个 commit。

## 路线盘点与 S1:tokens.css 拆分

- 问题:PRD 12 阶段进度不明;tokens.css 单文件 328 行是「加风格=塞文件」的根因。
- 过程:实测盘点(plan checkbox 全空,靠 git log + 代码验证判定进度)→ 定 S1-S5 路线(机制+挂点优先,密度维度降级为按需)→ recon 发现 4 个拆分陷阱(共享层归属/兜底双写/@import 层叠顺序/两个守卫硬编码路径)→ 上网调研 cascade layers(Tailwind 官方/Panda/MUI 一手核实)。
- 结论:拆 `tokens.base.css` + 三 flavor 文件(选项 Z:feishu light 留 base 不重复);**层叠顺序用 5 行守卫测试钉死而非 cascade layers**——layers 是层叠机制变更,与「纯搬运零变化」红线冲突,一次只改一个变量,layers 记 S1.5 备忘。三层零变化证据:测试绿 + build 多重集 ZERO-DIFF(634 行逐字节)+ 18 格视觉矩阵(唯一 diff 是 spinner 动画帧,亲验)。
- subagent-driven 执行,3 Task + 最终 review(揪出 architecture.md 真相源过期——plan 疏漏非实现错误)。

## 流程转变:连打模式

- 洋哥质疑「每切片 spec+plan 是否必要」。判断:对了一半——playbook 成熟后 spec/plan 信息量趋零该砍;但值表数据依赖(反幻想轴)与切片独立验收(归因)不能砍。
- 定案:Fable 5 主会话当架构师(读码/设计/验收),opus 派工执行,sonnet 做纯验证;砍每切片 spec/plan/正式 reviewer,留五步纪律(值表→token→挂点→矩阵→guard);对抗审只留 S5 前 + 总验收两个关键节点。已存记忆 `scaffold-batch-mode-fable-architect`。

## S2:token profile contract 守卫

- 设计:「表」极小化(11 色必填 = 三家明暗块实测交集 + radius-factor + 明暗块存在)+ 6 条推导式铁律(R1 回落/R2 选择器纪律/R3 base 纯净/R4 解析自检/R5 块体纯 token/R6 禁 at-rule)。
- 对抗审(实测型,带攻击脚本)揪出 4 Important:R1 域决策(维持 base-only,把「误伤」转化为「--spacing 禁分叉守卫」)、R5 堵裸属性泄漏、R6 替换 §3.5 假声明(at-rule 剥壳 R4 不红,实测证伪)、变异覆盖 8 规则只测 5 条。全采纳。
- 落地:runContract 纯函数 + 13 条变异红灯(全规则覆盖,验收时补 M4 缺文件臂);theme:guard 131→143。guard 原型先实测(现状绿+5 变异红)再写 spec——宣称先于文档验证。

## S3 badge / S4 Card 挂点

- badge:recon 发现原型无 badge、feishu/shadcn 值表零条目 → 定位改为「纯挂点建设」(5 token 值=现状,零视觉变化);claude 的 badge-pill(marketing 测量)显式不采用防误用;badge 无交互态,不造 .ui-badge 状态机,直接括号变量消费。
- Card:recon 发现**仓库根本没有 Card 组件**(卡片是 dashboard/login 散写类,p-5/p-6 不齐)→ S4 重定义为「造原语」:新建 ui/card.tsx + 3 token,业务页不迁(随纵切),theme-states 为首个消费方。运行时 computed 实测 radius 9px=12×0.75(feishu factor)证明 token 链活。
- registry 值表提前抓齐:badge/card 5 style 10 端点 + sera 12 组件 24 端点(nova 对照),S5 原料 100% 就位。

## S5:sera 第四风格(北极星验收)

- 设计 7 决策:D1 颜色抄 shadcn(官方 sera 本无色,cssVars 六 style 逐字节同)、**D2 排印「型」走 token 值**(text-transform/letter-spacing 可 token 化,global.css 零膨胀)、D3 label peer 豁免、D4 输入族下划线是唯一 global.css 型分支、D5/D7 不追随 radio 空心与 switch 方轨(有意偏离,不为差异而差异)、D6 radius 档无感不置灰。
- 对抗审 3 Important 全实锤:label peer 照抄官方会把 text-sm/font-normal 带给全 flavor(就地回归)→ 收窄为只撤 transform/tracking;theme-states 不渲染 Label/Dialog(矩阵验收对回归点全盲)→ 批1 补两个演示块;sera 填表漏 --field-ring-invalid。外加 4 个税单漏项(design-md-lint 白名单/snapshot 硬断言/visual 硬数字/switch 不自动方角)。
- 批1(排印挂点,零视觉变化)+ 批2(sera 落地 + 16 项注册税)。批2 卡壳点 4 处如实记录:最严重是设计终稿漏 --field-bg/--field-bg-focus/--field-border 三 token(实施者靠 registry 推导补上),其余 3 处清单缺口。
- **北极星结论:基建合格**——型/量差异 100% token 落地,global.css 全程 +2 选择器,加风格 ≈ 半天填表,contract 漏填精准红。

## 双轨终验 + 用户实测修复

- 轨一功能验收(亲验):sera 明暗矩阵、feishu 零回归、uppercase/tracking computed 实测(按钮 uppercase+1.5px/表头 0.65px)、业务页整体形态。
- 轨二工程 review(fresh-eyes,S2→S5 全 11 commit):零 Critical;**抓到我轨一误报**——badge「裸文字」实际底色还在(padding 归零的彩色小片),代码层证据推翻像素层印象。裁决走真裸文字(global.css +1 sera badge 分支)而非文档改口;附带修 contract 目录真扫描/radio 豁免载体/DialogTitle 防漂移。
- 洋哥自己上手抓到最后一个 bug:菜单弹窗 disabled 控件呈「假四边框」。真机取证:border 一直是对的,是 sera 漏填 --field-bg-disabled/readonly 回落 base 灰块,灰块边缘像边框。补 2 token + 2 断言 + design.md 记坑。
- 流程盲点记账:矩阵截图只看视口顶部,Field 矩阵的 disabled 演示在视口外——24 格全绿没兜住,真实业务页人肉走查不可替代。

## 终态

- 26 commit 全部 push(main == origin);测试 356→391、theme:guard 131→166、矩阵 18→24 格。
- 遗留债(全文档化):dashboard 散写卡片待纵切收敛、sera/shadcn 抽屉色点同色、CJK uppercase 无字形、加 flavor 需同步 4 个平行数组。
- PRD 剩余:Phase 3 组件族语义类收敛(连打可继续)、Phase 4 registry 工具化、S1.5 cascade layers(可选)。
