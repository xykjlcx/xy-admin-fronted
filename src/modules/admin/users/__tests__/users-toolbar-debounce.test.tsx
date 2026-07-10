import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';
import { UsersToolbar } from '@/modules/admin/users/list/UsersToolbar';
import { i18nInit } from '@/lib/i18n';
import type { UsersSearch } from '@/modules/admin/users/types';

const baseSearch: UsersSearch = { page: 2, pageSize: 10, status: 'all', keyword: '' };

beforeAll(async () => {
  await i18nInit;
});
afterEach(() => {
  vi.useRealTimers();
});

function renderToolbar() {
  const onSearchChange = vi.fn();
  render(
    <UsersToolbar variant="members" search={baseSearch} canCreate onSearchChange={onSearchChange} />,
  );
  return { onSearchChange, input: screen.getByRole('searchbox') };
}

test('debounces rapid keyword input into a single onSearchChange after 250ms', () => {
  vi.useFakeTimers();
  const { onSearchChange, input } = renderToolbar();

  fireEvent.change(input, { target: { value: 'a' } });
  fireEvent.change(input, { target: { value: 'ab' } });
  fireEvent.change(input, { target: { value: 'abc' } });
  expect(onSearchChange).not.toHaveBeenCalled();

  vi.advanceTimersByTime(249);
  expect(onSearchChange).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(onSearchChange).toHaveBeenCalledTimes(1);
  expect(onSearchChange).toHaveBeenCalledWith({ keyword: 'abc', page: 1 });
});

test('clearing the keyword submits immediately without waiting for the debounce', () => {
  vi.useFakeTimers();
  const { onSearchChange, input } = renderToolbar();

  fireEvent.change(input, { target: { value: 'a' } });
  onSearchChange.mockClear();

  fireEvent.change(input, { target: { value: '' } });
  expect(onSearchChange).toHaveBeenCalledWith({ keyword: '', page: 1 });
});

test('pressing Enter submits the current keyword immediately', () => {
  vi.useFakeTimers();
  const { onSearchChange, input } = renderToolbar();

  fireEvent.change(input, { target: { value: 'ab' } });
  onSearchChange.mockClear();
  fireEvent.keyDown(input, { key: 'Enter' });

  expect(onSearchChange).toHaveBeenCalledTimes(1);
  expect(onSearchChange).toHaveBeenCalledWith({ keyword: 'ab', page: 1 });
});

test('unmounting clears the pending debounce timer without throwing or firing', () => {
  vi.useFakeTimers();
  const onSearchChange = vi.fn();
  const view = render(
    <UsersToolbar variant="members" search={baseSearch} canCreate onSearchChange={onSearchChange} />,
  );
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ab' } });

  expect(() => view.unmount()).not.toThrow();
  vi.advanceTimersByTime(500);
  expect(onSearchChange).not.toHaveBeenCalled();
});
