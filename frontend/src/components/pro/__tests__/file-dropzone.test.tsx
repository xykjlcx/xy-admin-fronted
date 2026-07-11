import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileDropzone } from '@/components/pro/FileDropzone';

test('文件拖放区通过原生文件选择回传文件并展示名称', async () => {
  const onFiles = vi.fn();
  render(
    <FileDropzone
      label="点击或拖拽文件到此处上传"
      hint="单个不超过 100MB"
      inputLabel="选择文件"
      files={[]}
      onFiles={onFiles}
    />,
  );
  const file = new File(['report'], 'report.pdf', { type: 'application/pdf' });
  await userEvent.upload(screen.getByLabelText('选择文件'), file);

  expect(onFiles).toHaveBeenCalledWith([file]);
});
