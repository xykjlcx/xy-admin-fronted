export const menuKeys = {
  all: ['nav'] as const,
  subsystems: () => [...menuKeys.all, 'subsystems'] as const,
  menuLists: () => [...menuKeys.all, 'menus'] as const,
  menus: (subsystem: string) => [...menuKeys.all, 'menus', subsystem] as const,
};
