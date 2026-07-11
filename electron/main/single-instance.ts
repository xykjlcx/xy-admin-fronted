interface SingleInstanceApp {
  requestSingleInstanceLock(): boolean;
  exit(exitCode?: number): void;
  on(event: 'second-instance', listener: () => void): unknown;
}

export function claimSingleInstance(app: SingleInstanceApp, onSecondInstance: () => void): boolean {
  if (!app.requestSingleInstanceLock()) {
    // app.quit() 在 ready 前可能进入平台退出流程却不终止进程；无锁实例没有清理职责，应立即退出。
    app.exit(0);
    return false;
  }

  app.on('second-instance', onSecondInstance);
  return true;
}
