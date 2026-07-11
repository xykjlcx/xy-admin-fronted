export const profileKeys = {
  all: ['account', 'profile'] as const,
  detail: () => [...profileKeys.all, 'detail'] as const,
  security: () => [...profileKeys.all, 'security'] as const,
  preferences: () => [...profileKeys.all, 'preferences'] as const,
  devices: () => [...profileKeys.all, 'devices'] as const,
};
