// ★ 子系统唯一聚合点（spec §7.6 增删清单的注册步骤）：新子系统在此 push manifest。
// 菜单路径漂移校验放在 app/mount（createRouter 之后 fullPath 才计算完毕），此处保持纯聚合。
import { adminManifest } from '@/modules/admin/manifest';

export const manifests = [adminManifest];
