import { AppearanceDrawer } from './AppearanceDrawer';
import { DarkModeToggle } from './DarkModeToggle';
import { LanguageMenu } from './LanguageMenu';
import { UserMenu } from './UserMenu';

// Header 右侧动作组（原型 L311 顺序）：外观抽屉 → 暗色 → 语言 → 分隔线 → 用户菜单。
export function HeaderActions() {
  return (
    <div className="flex items-center gap-1.5">
      <AppearanceDrawer />
      <DarkModeToggle />
      <LanguageMenu />
      <span className="mx-1 h-[calc(22px*var(--app-scale))] w-px bg-border" />
      <UserMenu />
    </div>
  );
}
