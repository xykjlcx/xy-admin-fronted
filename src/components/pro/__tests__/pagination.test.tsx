import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Pagination } from '@/components/pro/Pagination';

const paginationLabels = {
  totalLabel: '14 records',
  prevLabel: 'Previous page',
  nextLabel: 'Next page',
  currentLabel: 'Current page',
};

test('Pagination renders adjacent page numbers and navigates by page button', async () => {
  const onPageChange = vi.fn();
  render(
    <Pagination
      page={1}
      pageCount={2}
      {...paginationLabels}
      onPageChange={onPageChange}
    />,
  );

  expect(screen.getByText('14 records')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Current page' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
  const pageGroup = screen.getByRole('button', { name: '2' }).closest('ol');
  if (!pageGroup) throw new Error('page group not found');
  expect(pageGroup).toHaveClass('gap-[calc(2px*var(--app-scale))]');
  await userEvent.click(screen.getByRole('button', { name: '2' }));
  expect(onPageChange).toHaveBeenCalledWith(2);
});

test('Pagination collapses long ranges with ellipsis while keeping nearby targets visible', async () => {
  const onPageChange = vi.fn();
  render(
    <Pagination
      page={5}
      pageCount={10}
      {...paginationLabels}
      onPageChange={onPageChange}
    />,
  );

  expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Current page' })).toHaveTextContent('5');
  expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
  expect(screen.getAllByText('...')).toHaveLength(2);

  await userEvent.click(screen.getByRole('button', { name: '6' }));
  expect(onPageChange).toHaveBeenCalledWith(6);
});
