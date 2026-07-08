# 0707 控件高度切片 recon 与 Chrome 调试踩坑

> 接续「设计系统 preset 化」基础层。原计划 Phase 2b 第二个密度切片做「控件高度阶梯」，recon 后判为**弱差异维度**并暂缓；转实测验证时撞上 Chrome 136+ 调试限制，未采到真机数据。

## 下一切片规划：控件高度被 recon 判为弱差异维度

- **问题**：field-px 切片跑通后按 playbook 选下一个密度维度。直觉选「控件高度阶梯」（`--control-*` 开放 flavor）——理由是纯「量」、组件层已全部消费 `--control-*` token（button/input/select/native-select/tabs/pagination），工程比 field-px 还轻（只需 tokens.css 加 flavor 覆盖块 + 清 SideList 硬编码 h-9）。
- **过程**：开工前 recon 现码 + 三家 research 交叉核，填「3 风格 × sm/md/lg」9 格矩阵：
  - **shadcn**（组件库）：源码 radix/new-york 线 sm32/md36/lg40；官网当前是 Base UI 线 xs24/default32/large36（**shadcn 自己两条线尺寸就不统一**）。
  - **飞书**：admin.feishu.cn 实测只有 md 档（主按钮 32 / 输入 36），飞书 UD token dump 里无控件 height/size key（admin 前端把 token 编译成字面量）；sm/lg 缺。
  - **claude**：Anthropic MCP 官方 Design Token 的 Spacing & Dimension 只有 radius/border/shadow，无控件高度；营销站零星 36-44；无后台三档体系。
  - 9 格**只 4 格有据**（shadcn 全 3 + 飞书 md 1）；三家 md 差异只有飞书按钮 32 vs 其它 36，且早已 `--control-btn-md` 分档。
- **结论**：控件高度是**弱差异维度**——飞书/claude 不是组件库、没有系统的后台 sm/md/lg 控件体系，源头就没有可实测的三档差异。强分三档 = 为差异而差异，撞 PRD §7.5「值表没有的差异不进 token」+ §10 风险表「过度抽象」。据实建议下一切片改做 **table 密度**（飞书 admin 表头 ≈24 / 行高 ≈28 是有实测据的真差异，后台主视觉体感最强）。洋哥要求先用实测把「数据到底空不空」钉死再判断（顺带把 table 一起测）。
- **耗时**：约 1 小时

## agent-browser 实测踩坑：Chrome 136+ 默认 profile 禁调试

- **问题**：要用 agent-browser 实测飞书 admin / claude.ai 的控件高度 + 表格密度（需登录态）。
- **过程**：
  1. `--auto-connect` 连上的是 agent-browser 自己下载的 **headless Chrome for Testing**（`~/.agent-browser/browsers/`，`navigator.webdriver=true`），**不是真实浏览器**——没核实 headless 就当成真实浏览器采了 shadcn（无需登录，成功但认错了源）。教训：连浏览器第一步必验 `navigator.webdriver` / UA / headless（`verify-before-dismiss` 的反面）。
  2. 要连真实登录态需真实 Chrome 带 `--remote-debugging-port` 启动。踩了两个 shell/macOS 坑：`open -a "Google Chrome" --args` 在 Chrome **未完全退出**时不生效（只激活旧窗口、忽略 flag）；zsh 把 `--remote-allow-origins=*` 的 `*` 当 glob 展开，需加引号。
  3. **核心铁律**：Chrome 136+ 安全策略禁止**默认 profile**（有登录态）开 remote debugging——端口监听着但 CDP `/json/version` 返 **404**（`curl -v` 坐实：连接建立、返 404 空 body）。无 MDM 策略、Chrome 版本 150。改用临时 `--user-data-dir` 启动则 CDP **立即可用**（返完整 JSON version + webSocketDebuggerUrl）——**坐实是默认 profile 被禁，非环境/策略问题**。
  4. **死结**：有登录态的默认 profile 不能调试，能调试的独立 profile 没登录态。临时 profile 要重新扫码登录飞书，洋哥不愿再开新窗口，中止实测。
- **结论**：agent-browser 用真实登录态，**默认 profile 走不通**。出路：① 独立 profile 手动登录一次；② 放弃真机、走公开设计规范（Semi/Arco/飞书 UD）。飞书 admin 表格密度 research 2026-07-04 已有（表头24/行高28），真机重测边际增量小。
- **耗时**：约 1.5 小时（大量往返）

## 有效产出

- shadcn button 官网 Base UI 线实测：xs24 / default32 / large36（px 8~16、fs 12~14px、圆角 8~10px）——与源码 radix 线（sm32/md36/lg40，本项目 `components.json` 对标线）不同，shadcn 两条线并存再次确认（research `shadcn-source-contracts.md` L123-124 早有警告，实测印证）。

## 遗留

- 5 commit（field-px）仍未 push origin/main。
- 下一切片方向：table 密度（recon 判控件高度弱差异，暂缓或仅轻做——对齐 shadcn 源码档 + 清 SideList 的 `h-9`，不强造 flavor 差异）。
- **清理待办**：约 77 个 agent-browser 泄漏 headless 进程（Chrome for Testing，各占 ~20% CPU）+ 临时 profile Chrome 窗口（`scratchpad/cdp-verify-profile`）+ 默认 profile 带调试端口的 Chrome（采集残留）。

## 沉淀

- `Chrome 136+ 默认 profile 禁 remote debugging` 值得进 agent-browser / 浏览器自动化知识库：以后要复用真实登录态，默认 profile 一律走不通，规划实测方案时先掂量「用登录态」的必要性 vs 公开数据/规范能否替代。
