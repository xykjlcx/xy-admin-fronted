# 设计体系稿件生成规格（给 subagent）

## 目标
在 `/Users/ocean/Documents/通用脚手架前端/design-explore/` 下生成 `.dc.html` 设计稿，
每份 = 同一个「成员与部门」列表页，用不同设计体系的视觉语言重画。
现有 18 份可作参考（如 `TDesign.dc.html`、`BaseWeb.dc.html`、`StripeDashboard.dc.html`）。

## 硬性约束（不满足即返工）

1. **画布固定 1440 × 850**，最外层结构必须是：
   ```html
   <div style="width:1440px;height:850px;display:flex;flex-direction:column;font-family:...;">
     <!-- 72px 说明条（banner）-->
     <!-- 778px 应用界面 -->
   </div>
   ```
2. **内容必须填满，不能裁切、不能溢出**。底部留白控制在 100px 以内。
3. **信息密度 130–300 格**（格子数 = 表格列数 × 数据行数）。这是这批稿子的核心指标，
   低于 130 视为不合格。靠压行高（28–44px）和加列数（11–16 列）达成。
4. 文件格式必须是 Design Component：
   ```html
   <!doctype html>
   <html><head><meta charset="utf-8"><script src="./support.js"></script></head>
   <body><x-dc>
   <helmet>
     <!-- 可选 Google Fonts link -->
     <style> body{margin:0;background:XXX;} *{box-sizing:border-box;} ...你的类... </style>
   </helmet>
   ...页面结构...
   </x-dc></body></html>
   ```
   - `<script src="./support.js">` 这行必须原样保留
   - 不要用 `{{handlebars}}`、`<sc-for>`、`<script data-dc-script>`，全部静态展开
   - 所有标签闭合、所有属性带引号

## 数据与工具

`_kit.py` 已提供，用 `exec(open('_kit.py').read())` 载入，可得：
- `MEMBERS`：14 条成员数据，字段顺序
  `(工号, 姓名, 邮箱, 状态ok/wait, 部门, 角色, 手机号, 入职日期, 最近登录, 2FA(1/0), 数据范围)`
- `banner(key, name, lin, spec, dens, cost)`：生成顶部 72px 深色说明条，**必须用它**
- `page(fname, css, body, bg, family, font_link='')`：写文件
- `svg(path, size, sw, stroke)` 和图标字典 `I`（含 grid/users/shield/menu/log/folder/gear/search/bell/plus/down/right/filter/dots/vdots/up/dl/check/x）
- `NAV7`：7 项侧边菜单 `(标签, 图标key, 是否选中)`

用 python 脚本生成文件（参考现有文件的写法），不要手写整份 HTML。

## banner 六个参数怎么填

- `key` — 形如 `方向 Z`（我会指定字母）
- `name` — 体系名，如 `Element Plus`
- `lin` — 出处，如 `饿了么 · 国内使用率第二`
- `spec` — **规范**：这套体系一眼认出的那个元素是什么，写具体值。
  可用 `<span style="color:#fafafa;font-weight:600;">重点</span>` 强调。控制在 70 字内。
- `dens` — 密度，形如 `13 行 × 12 列`
- `cost` — **代价**：这套体系真实的缺点，要诚实，不要写场面话。控制在 30 字内。

## 表格列（11–16 列，按体系密度选）
工号 / 姓名 / 邮箱 / 状态 / 部门 / 角色 / 手机号 / 最近登录 / 2FA / 数据范围 / 操作
（可加：入职日期、部门编码、直属上级、工龄）

## 自检（写完必须跑，把结果贴进报告）
```python
import pathlib, re
s = pathlib.Path('你的文件.dc.html').read_text()
print('div 平衡:', s.count('<div') == s.count('</div>'))
print('support.js:', './support.js' in s)
print('画布尺寸:', 'width:1440px;height:850px' in s.replace(' ', ''))
# 行高 / 列数 / 行数
m = re.search(r'\.你的行class \{[^}]*?height: ?(\d+)px', s)
g = re.search(r'\.你的行class \{[^}]*?grid-template-columns: ?([^;]+);', s)
rows = s.count('class="你的行class"')
print(f'行高 {m.group(1)}px, 列 {len(g.group(1).split())}, 行 {rows}, 格子 {len(g.group(1).split())*rows}')
```

## 不要做
- 不要发布 artifact，不要碰 `canvas.json`，不要动现有 18 份文件
- 不要用 emoji 当图标（用 inline SVG）
- 不要编造色值：我在任务里给了每个体系的关键 token，按那个来；
  确实缺的值可以合理推导，但要在报告里说明哪些是推导的
