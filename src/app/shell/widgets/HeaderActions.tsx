import { DarkModeToggle } from './DarkModeToggle';
import { LanguageMenu } from './LanguageMenu';
import { UserMenu } from './UserMenu';

// Header 右侧动作组：暗色 / 语言 / 分隔线 / 用户菜单。
// 外观抽屉的触发按钮在 Task 14 前置到本组件最左（照原型 L311 顺序：外观→暗色→语言→分隔→用户）。
export function HeaderActions() {
  return (
    <div className="flex items-center gap-1.5">
      <DarkModeToggle />
      <LanguageMenu />
      <span className="mx-1 h-[22px] w-px bg-border" />
      <UserMenu />
    </div>
  );
}
