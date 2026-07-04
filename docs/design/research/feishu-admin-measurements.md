# 飞书管理后台 computed style 实测记录

- 来源：admin.feishu.cn（真实企业登录态）
- 采集：2026-07-04，Agent Browser / CDP，getComputedStyle 实测
- 页面：企业概览（/admin/index）、成员与部门（/admin/contacts/departmentanduser）
- 说明：admin 前端不使用 CSS 变量（259 张样式表、仅 3 个自定义属性，token 在构建期编译为字面量），
  故本记录为组件级 computed style 采样。主应用的完整 UD 变量体系见 feishu-ud-tokens.json。

## 全局

| 项 | 实测值 |
| --- | --- |
| body 背景 | `#ffffff` |
| body 字体 | `LarkHackSafariFont, LarkEmojiFont, LarkChineseQuot...`，14px |
| 侧栏背景 | `rgb(242, 243, 245)`（= UD N100 `#F2F3F5`） |

## 输入框（`ud__input ud__input--size-md`，wrapper 层）

| 状态 | 实测值 |
| --- | --- |
| base | bg `rgb(242,243,245)`；border `0.555556px rgb(242,243,245)`（**与底同色，无边框感**）；radius 6px；shadow none；高 ≈36px |
| focus（`ud__input--focused`） | bg **`rgb(255,255,255)`（反转为白）**；border `0.555556px rgb(51,112,255)`（蓝 `#3370FF`）；**shadow none（无 ring）** |

注：0.555556px = 1px ÷ 1.8（高分屏 hairline 处理）。裸 `<input>` 元素本身全透明，样式在 wrapper。

## 按钮

| 项 | 实测值 |
| --- | --- |
| 主按钮（成员页"添加成员"） | bg `rgb(51,112,255)` `#3370FF`；fg 白；radius 6px；高 ≈32px；14px / 字重 400 |
| 概览页小按钮（立即认证/升级咨询） | radius 6px；高 ≈26px（xs 档） |
| 概览页中按钮（立即升级） | radius 4px；高 ≈32px |

## 表格（成员与部门页）

| 项 | 实测值 |
| --- | --- |
| 表头容器（company-table-header） | bg **透明**；无下边框（分割线在行上）；高 ≈24px |
| 表头文字 | `rgb(31,35,41)` `#1F2329`，14px / 字重 400 |
| 行高 | ≈28px（紧凑档；供 Step 7 密度 token 参考，落地前建议复核完整值） |

## 关键结论

1. 输入框 = **灰底（N100）无边框感 → focus 白底反转 + 1px 蓝边，无 ring 晕染**。
2. 主按钮 32px 高、字重 400、6px 圆角——比常见组件库更小巧轻盈。
3. admin 蓝为 `#3370FF`；主应用当代 UD 蓝为 `#1456F0`（B600）/hover `#336DF4`（B500），两代并存（见 feishu-ud-tokens.json）。
