import { render, screen } from '@testing-library/react';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';

function renderDialog(description?: string) {
  render(
    <Dialog open>
      <FormDialogContent
        title="标题"
        description={description}
        cancelText="取消"
        submitText="保存"
        onCancel={() => undefined}
        onSubmit={() => undefined}
      >
        <div>content</div>
      </FormDialogContent>
    </Dialog>,
  );
}

test('FormDialogContent renders a description wired to the dialog via aria-describedby', () => {
  renderDialog('这是描述文案');

  const dialog = screen.getByRole('dialog');
  const description = screen.getByText('这是描述文案');
  expect(description.getAttribute('id')).toBeTruthy();
  expect(dialog).toHaveAttribute('aria-describedby', description.getAttribute('id'));
});

test('FormDialogContent omits aria-describedby when no description is provided', () => {
  renderDialog();

  expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby');
});
