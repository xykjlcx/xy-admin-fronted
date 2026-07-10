import { createSessionCredentialService } from '@/lib/session-credential-service';

function createDependencies() {
  let token: string | null = null;
  const credentials = {
    restore: vi.fn().mockResolvedValue('restored-token'),
    persist: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
  const auth = {
    getToken: () => token,
    setToken: vi.fn((next: string | null) => {
      token = next;
    }),
  };
  const cache = { cancel: vi.fn().mockResolvedValue(undefined), clear: vi.fn() };
  return { credentials, auth, cache };
}

test('session restore is single-flight and restores memory before application mount', async () => {
  const dependencies = createDependencies();
  const service = createSessionCredentialService(dependencies);

  await expect(Promise.all([service.restore(), service.restore()])).resolves.toEqual([
    'restored-token',
    'restored-token',
  ]);
  expect(dependencies.credentials.restore).toHaveBeenCalledTimes(1);
  expect(dependencies.auth.getToken()).toBe('restored-token');
});

test('restore failures start without a session instead of blocking application mount', async () => {
  const dependencies = createDependencies();
  dependencies.credentials.restore.mockRejectedValueOnce(new Error('keychain locked'));
  const service = createSessionCredentialService(dependencies);

  await expect(service.restore()).resolves.toBeNull();
  expect(dependencies.auth.getToken()).toBeNull();
});

test('replace persists first and never publishes a token when persistence fails', async () => {
  const dependencies = createDependencies();
  dependencies.credentials.persist.mockRejectedValueOnce(new Error('persist failed'));
  const service = createSessionCredentialService(dependencies);

  await expect(service.replace('new-token')).rejects.toThrow('persist failed');
  expect(dependencies.auth.getToken()).toBeNull();
  expect(dependencies.cache.clear).not.toHaveBeenCalled();
});

test('clear invalidates memory and cache even when physical credential cleanup fails', async () => {
  const dependencies = createDependencies();
  const service = createSessionCredentialService(dependencies);
  await service.replace('active-token');
  dependencies.credentials.clear.mockRejectedValueOnce(new Error('cleanup failed'));

  await expect(service.clear('expired')).rejects.toThrow('cleanup failed');
  expect(dependencies.auth.getToken()).toBeNull();
  expect(dependencies.cache.cancel).toHaveBeenCalled();
  expect(dependencies.cache.clear).toHaveBeenCalled();
});
