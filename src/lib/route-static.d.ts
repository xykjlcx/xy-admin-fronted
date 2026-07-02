// staticData 类型（spec §7.4：路由文件是权限元数据单一真相）。
// 提前在 Task 8 落地——路由一声明 staticData 就需要它（否则对空接口做超集属性赋值会编译报错）。
import '@tanstack/react-router';

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    label?: string; // 面包屑兜底（菜单树命中时优先用菜单 lv(label)）
    permission?: string; // 页面 view 权限符（_auth beforeLoad 据此做页面级守卫）
    actions?: { code: string; label: string }[]; // 按钮级权限点（角色配置页聚合用）
    group?: string; // 权限配置页"模块"分组
  }
}
