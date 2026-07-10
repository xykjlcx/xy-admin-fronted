export const ipcChannels = {
  clipboardWrite: 'desktop:clipboard:write-text',
  externalOpen: 'desktop:external:open',
  credentialRestore: 'desktop:credential:restore',
  credentialPersist: 'desktop:credential:persist',
  credentialClear: 'desktop:credential:clear',
} as const;

export type DesktopIpcChannel = (typeof ipcChannels)[keyof typeof ipcChannels];
