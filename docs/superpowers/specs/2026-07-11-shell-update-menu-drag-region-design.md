# Shell 更新入口与窗口拖动区设计

## 1. 目标

在不改变双宿主、安全模型和更新状态机的前提下完成三项 Shell 收敛：

1. 顶栏不再常驻更新按钮，更新入口统一进入用户菜单。
2. macOS `integrated + rail` 的首个图标向上收紧，但不碰撞红黄绿按钮。
3. `integrated` 顶栏扩大为“背景可拖、真实交互控件不可拖”，解决只能拖最上沿的问题。

## 2. 更新入口

- `HeaderActions` 与 Inset 顶栏移除 `UpdateStatus`，所有布局只在 `UserMenu` 暴露一个更新入口。
- 更新控制器仍随 `UserMenu` 常驻挂载，保留启动自动检查、在线恢复检查、状态订阅、下载、取消、重试和安装；不能因为菜单关闭而卸载。
- 菜单项按状态显示：检查更新、发现版本、下载进度、重启安装、更新失败。`idle/checking/upToDate` 点击执行检查，其余状态打开现有更新详情 Dialog。
- Web updater capability 为 `unsupported` 时不渲染菜单项；禁止通过运行时字符串分支判断 Electron。
- 更新错误不再占用顶栏，仅通过菜单状态、Dialog 和去重 toast 反馈。

## 3. 拖动区域

- `ShellHeader` 和 Inset Header 的顶层背景保持 `desktop-drag-region`。
- 移除覆盖整列的 `desktop-no-drag`；全局规则继续只对 `button/a/input/textarea/select/[role=button|menuitem|searchbox]` 设置 `no-drag`。
- 面包屑、普通标题文字和控件之间的空白均可拖；按钮、搜索框、菜单、链接保持正常交互。
- Rail 左上角仍保留独立拖动区；Web/native 下 `app-region` 不生效，Windows 右侧系统按钮安全区不变。

## 4. Rail 顶部密度

- 仅在存在左侧窗口控件安全区时，把 Rail 纵向占位从完整标题栏高度收紧 16px。
- 保留 4pt 节奏、顶部内边距和按钮点击尺寸；全屏、native、Web、Windows 左侧 inset 为 0 时不产生负高度或额外偏移。

## 5. 验证

- 架构守卫：Header/Inset 不再渲染顶栏更新入口；UserMenu 唯一消费更新状态与 Dialog。
- 组件测试：自动检查、菜单状态、打开 Dialog、下载/取消/安装/重试与 Web 隐藏。
- Shell 守卫：顶栏列容器不再整块 `desktop-no-drag`，交互元素仍由全局 no-drag 规则覆盖。
- 几何/E2E：native/integrated、三套 Shell、三档比例无溢出；Rail 首项位于红黄绿按钮下方且间距收紧。
- 真实 Electron：截图核对顶栏无更新按钮、菜单内入口、Rail 顶部间距；用窗口坐标变化验证顶栏空白拖动有效。

## 6. 非目标

- 不新增头像更新红点、系统通知、托盘菜单或后台静默安装。
- 不修改 updater IPC、generic feed、签名与发布策略。
- 不让输入框、按钮或链接成为拖动区。
