export const ipcChannels = {
  clipboardWrite: 'desktop:clipboard:write-text',
  externalOpen: 'desktop:external:open',
} as const;

export type DesktopIpcChannel = (typeof ipcChannels)[keyof typeof ipcChannels];
