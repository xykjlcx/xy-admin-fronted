import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QueryState } from '@/components/pro/QueryState';

test('QueryState renders accessible loading, error and recovered content states', async () => {
  const onRetry = vi.fn();
  const { rerender } = render(
    <QueryState
      data={undefined}
      pending
      error={false}
      loadingLabel="正在加载渠道"
      errorLabel="渠道加载失败"
      retryLabel="重试"
      onRetry={onRetry}
    >
      {(data: { name: string }) => <div>{data.name}</div>}
    </QueryState>,
  );

  expect(screen.getByRole('status', { name: '正在加载渠道' })).toBeInTheDocument();

  rerender(
    <QueryState
      data={undefined}
      pending={false}
      error
      loadingLabel="正在加载渠道"
      errorLabel="渠道加载失败"
      retryLabel="重试"
      onRetry={onRetry}
    >
      {(data: { name: string }) => <div>{data.name}</div>}
    </QueryState>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('渠道加载失败');
  await userEvent.click(screen.getByRole('button', { name: '重试' }));
  expect(onRetry).toHaveBeenCalledOnce();

  rerender(
    <QueryState
      data={{ name: '德国标准渠道' }}
      pending={false}
      error={false}
      loadingLabel="正在加载渠道"
      errorLabel="渠道加载失败"
      retryLabel="重试"
      onRetry={onRetry}
    >
      {(data) => <div>{data.name}</div>}
    </QueryState>,
  );
  expect(screen.getByText('德国标准渠道')).toBeInTheDocument();
});
