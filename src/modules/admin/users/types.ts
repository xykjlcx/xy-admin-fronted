import type { UserDto, UsersQueryParams } from './api';

export type TabKey = 'members' | 'depts' | 'left';

/** URL search 协议 = 查询参数 + 关键词。与路由 validateSearch 对齐 */
export type UsersSearch = UsersQueryParams & { keyword: string };

/** 表单弹窗状态：discriminated union，form 组件按 kind 分支渲染 */
export type UserFormState =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; user: UserDto };

/** 成员场景变体 */
export type MembersVariant = 'members' | 'left';
