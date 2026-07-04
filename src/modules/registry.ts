// ★ 子系统唯一聚合点（spec §7.6 增删清单的注册步骤）：新子系统在此 push manifest。
// 页面、菜单、mock 种子都围绕 manifest 注册，避免新增业务域时到处散改入口。
import { adminManifest } from '@/modules/admin/manifest';

export const manifests = [adminManifest];

// dev 菜单漂移校验（断言逻辑归 registry，mount 在 createRouter 之后调用并传入有效路径）。
// 种子已由 RoutePath 编译期收窄；此运行时断言防未来 DB 菜单数据漂移到不存在路由。
export function assertMenuPathsValid(validPaths: Iterable<string>): void {
  const valid = new Set(validPaths);
  for (const m of manifests)
    for (const rec of m.menuSeed)
      if (rec.path && !valid.has(rec.path))
        console.error(`[menu-drift] 菜单 ${rec.id} 指向不存在路由: ${rec.path}`);
}
