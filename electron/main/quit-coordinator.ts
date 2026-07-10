interface QuitEvent {
  preventDefault(): void;
}

interface QuitCoordinatorDependencies {
  cleanup(): Promise<void>;
  quit(): void;
  isUpdateInstallRequested(): boolean;
  reportError(message: string, error: unknown): void;
}

export function createQuitCoordinator(dependencies: QuitCoordinatorDependencies) {
  let allowQuit = false;
  let cleanupPromise: Promise<void> | null = null;

  return (event: QuitEvent): void => {
    if (allowQuit || dependencies.isUpdateInstallRequested()) return;
    event.preventDefault();
    if (cleanupPromise) return;

    cleanupPromise = dependencies
      .cleanup()
      .catch((error: unknown) => dependencies.reportError('download cleanup failed', error))
      .then(() => {
        allowQuit = true;
        dependencies.quit();
      });
  };
}
