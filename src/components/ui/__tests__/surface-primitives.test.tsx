import { render, screen } from '@testing-library/react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

test('DialogContent 使用 surface 背景而不是页面背景', () => {
  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>确认操作</DialogTitle>
        <div>Dialog body</div>
      </DialogContent>
    </Dialog>,
  );

  const content = screen.getByText('Dialog body').closest('[data-slot="dialog-content"]');
  expect(content).toHaveClass('bg-surface');
  expect(content).not.toHaveClass('bg-background');
});

test('SheetContent 使用 surface 背景而不是页面背景', () => {
  render(
    <Sheet open>
      <SheetContent>
        <SheetTitle>外观设置</SheetTitle>
        <div>Sheet body</div>
      </SheetContent>
    </Sheet>,
  );

  const content = screen.getByText('Sheet body').closest('[data-slot="sheet-content"]');
  expect(content).toHaveClass('bg-surface');
  expect(content).not.toHaveClass('bg-background');
});
