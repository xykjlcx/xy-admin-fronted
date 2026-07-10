export const ipcChannels = {
  clipboardWrite: 'desktop:clipboard:write-text',
  externalOpen: 'desktop:external:open',
  credentialRestore: 'desktop:credential:restore',
  credentialPersist: 'desktop:credential:persist',
  credentialClear: 'desktop:credential:clear',
  fileDownloadStart: 'desktop:file:download-start',
  fileDownloadCancel: 'desktop:file:download-cancel',
} as const;

export const ipcEvents = {
  windowStateChanged: 'desktop:window:state-changed',
  fileDownloadChanged: 'desktop:file:download-changed',
} as const;

export type DesktopIpcChannel = (typeof ipcChannels)[keyof typeof ipcChannels];
export type DesktopIpcEvent = (typeof ipcEvents)[keyof typeof ipcEvents];
