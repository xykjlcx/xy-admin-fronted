import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { UpdateStatus } from '@/app/shell/widgets/UpdateStatus';
import type { AppPlatform, UpdateSnapshot } from '@/lib/platform';
import { i18nInit } from '@/lib/i18n';

beforeAll(async () => i18nInit);

const baseSnapshot: UpdateSnapshot = {
  status: 'idle',
  currentVersion: '0.1.0',
  operationId: null,
  lastCommand: null,
  retryable: false,
  targetVersion: null,
  releaseDate: null,
  releaseNotes: null,
  packageSize: null,
  transferred: 0,
  total: 0,
  percent: 0,
  bytesPerSecond: 0,
  errorCode: null,
};

function createUpdater(initial: UpdateSnapshot) {
  let listener: ((snapshot: UpdateSnapshot) => void) | undefined;
  const updater: AppPlatform['updater'] = {
    getSnapshot: vi.fn().mockResolvedValue(initial),
    check: vi.fn().mockResolvedValue({ ok: true, snapshot: initial }),
    download: vi.fn().mockResolvedValue({ ok: true, snapshot: initial }),
    cancelDownload: vi.fn().mockResolvedValue({ ok: true, snapshot: initial }),
    install: vi.fn().mockResolvedValue({ ok: true, snapshot: initial }),
    retry: vi.fn().mockResolvedValue({ ok: true, snapshot: initial }),
    subscribe: vi.fn((next) => {
      listener = next;
      return () => undefined;
    }),
  };
  return { updater, emit: (snapshot: UpdateSnapshot) => listener?.(snapshot) };
}

test('Web host renders no updater entry and performs no update command', () => {
  const { updater } = createUpdater(baseSnapshot);
  const { container } = render(<UpdateStatus runtime="web" updater={updater} />);
  expect(container).toBeEmptyDOMElement();
  expect(updater.check).not.toHaveBeenCalled();
});

test('Desktop background check stays quiet until an update becomes available', async () => {
  const available: UpdateSnapshot = {
    ...baseSnapshot,
    status: 'available',
    operationId: '9ba560a3-94c6-438a-9d76-1e17627fd483',
    lastCommand: 'check',
    targetVersion: '0.2.0',
    releaseDate: '2026-07-11T00:00:00.000Z',
    releaseNotes: '安全性与稳定性改进',
    packageSize: 4096,
    total: 4096,
  };
  const harness = createUpdater(baseSnapshot);
  harness.updater.check = vi.fn().mockResolvedValue({ ok: true, snapshot: baseSnapshot });
  render(<UpdateStatus runtime="desktop" updater={harness.updater} />);

  await waitFor(() => expect(harness.updater.check).toHaveBeenCalledOnce());
  expect(screen.queryByRole('button', { name: /更新/ })).not.toBeInTheDocument();
  act(() => harness.emit(available));
  await userEvent.click(screen.getByRole('button', { name: '发现新版本 0.2.0' }));
  expect(screen.getByRole('dialog', { name: '软件更新' })).toBeInTheDocument();
  expect(screen.getByText('安全性与稳定性改进')).toBeInTheDocument();
  expect(screen.getByText('0.1.0 → 0.2.0')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '下载更新' }));
  expect(harness.updater.download).toHaveBeenCalledOnce();

  act(() =>
    harness.emit({
      ...available,
      status: 'downloading',
      lastCommand: 'download',
      transferred: 2048,
      total: 4096,
      percent: 50,
      bytesPerSecond: 1024,
    }),
  );
  expect(screen.getByRole('progressbar', { name: '更新下载进度' })).toHaveAttribute('aria-valuenow', '50');
  await userEvent.click(screen.getByRole('button', { name: '取消下载' }));
  expect(harness.updater.cancelDownload).toHaveBeenCalledOnce();

  act(() =>
    harness.emit({
      ...available,
      status: 'downloaded',
      lastCommand: 'download',
      transferred: 4096,
      total: 4096,
      percent: 100,
    }),
  );
  await userEvent.click(screen.getByRole('button', { name: '重启并安装' }));
  expect(harness.updater.install).toHaveBeenCalledOnce();
});

test('Desktop error entry exposes only a retry action', async () => {
  const errorSnapshot: UpdateSnapshot = {
    ...baseSnapshot,
    status: 'error',
    operationId: '9ba560a3-94c6-438a-9d76-1e17627fd483',
    lastCommand: 'check',
    retryable: true,
    errorCode: 'UPDATE_CHECK_FAILED',
  };
  const harness = createUpdater(errorSnapshot);
  render(<UpdateStatus runtime="desktop" updater={harness.updater} autoCheck={false} />);
  await userEvent.click(await screen.findByRole('button', { name: '更新检查失败' }));
  expect(screen.getByRole('alert')).toHaveTextContent('无法检查更新，请稍后重试');
  expect(screen.queryByText('UPDATE_CHECK_FAILED')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '重试' }));
  expect(harness.updater.retry).toHaveBeenCalledOnce();
});
