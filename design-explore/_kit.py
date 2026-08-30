exec(open('_members.py').read())

def banner(key, name, lin, spec, dens, cost):
    return f'''  <div style="height:72px;flex-shrink:0;background:#18181b;color:#fafafa;display:flex;align-items:center;justify-content:space-between;padding:0 28px;">
    <div style="display:flex;align-items:baseline;gap:13px;">
      <span style="font-size:11px;font-weight:600;letter-spacing:0.14em;color:#71717a;">{key}</span>
      <span style="font-size:19px;font-weight:600;letter-spacing:-0.01em;">{name}</span>
      <span style="font-size:12px;color:#a1a1aa;">{lin}</span>
      <span style="font-size:11px;color:#4ade80;padding:2px 8px;border-radius:999px;background:rgba(74,222,128,0.14);">{dens}</span>
    </div>
    <div style="display:flex;gap:24px;font-size:11.5px;line-height:1.5;">
      <div style="max-width:370px;"><span style="color:#4ade80;">规范 </span><span style="color:#d4d4d8;">{spec}</span></div>
      <div style="max-width:195px;"><span style="color:#fb923c;">代价 </span><span style="color:#d4d4d8;">{cost}</span></div>
    </div>
  </div>
'''

def page(fname, css, body, bg, family, font_link=''):
    import pathlib
    pathlib.Path(fname).write_text(f'''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{font_link}  <style>
    body {{ margin:0; background:{bg}; }}
    * {{ box-sizing:border-box; }}
{css}  </style>
</helmet>

<div style="width:1440px;height:850px;display:flex;flex-direction:column;font-family:{family};">
{body}
</div>
</x-dc>
</body>
</html>
''')

def svg(path, size=15, sw=1.8, stroke='currentColor'):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{stroke}" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">{path}</svg>')

I = {
 'grid':'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 'users':'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
 'shield':'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
 'menu':'<path d="M3 5h8"/><path d="M3 12h8"/><path d="M3 19h8"/><path d="M15 5h6"/><path d="M15 12h6"/><path d="M15 19h6"/>',
 'log':'<path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/>',
 'folder':'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
 'gear':'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
 'search':'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 'bell':'<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>',
 'plus':'<path d="M5 12h14"/><path d="M12 5v14"/>',
 'down':'<path d="m6 9 6 6 6-6"/>',
 'right':'<path d="m9 18 6-6-6-6"/>',
 'filter':'<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>',
 'dots':'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
 'vdots':'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
 'up':'<path d="M12 15V3"/><path d="m8 7 4-4 4 4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
 'dl':'<path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
 'check':'<path d="M20 6 9 17l-5-5"/>',
 'x':'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
}
NAV7 = [("企业概览",'grid',0),("成员与部门",'users',1),("角色与权限",'shield',0),
        ("菜单管理",'menu',0),("日志审计",'log',0),("文件管理",'folder',0),("企业信息",'gear',0)]
