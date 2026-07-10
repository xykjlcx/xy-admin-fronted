import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/pro/FileDropzone';
import { FieldError } from '@/components/ui/field';
import { MAX_FILE_SIZE_BYTES } from '../api';

export function UploadFileDialog({
  open,
  files,
  pending,
  labels,
  onOpenChange,
  onFiles,
  onSubmit,
}: {
  open: boolean;
  files: File[];
  pending: boolean;
  labels: {
    title: string;
    drop: string;
    hint: string;
    input: string;
    cancel: string;
    submit: string;
    tooLarge: string;
  };
  onOpenChange: (open: boolean) => void;
  onFiles: (files: File[]) => void;
  onSubmit: () => void;
}) {
  const [error, setError] = useState('');
  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) setError('');
    onOpenChange(nextOpen);
  };

  const selectFiles = (nextFiles: File[]) => {
    if (nextFiles.some((file) => file.size > MAX_FILE_SIZE_BYTES)) {
      setError(labels.tooLarge);
      onFiles([]);
      return;
    }
    setError('');
    onFiles(nextFiles);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>
        <FileDropzone
          label={labels.drop}
          hint={labels.hint}
          inputLabel={labels.input}
          files={files}
          onFiles={selectFiles}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
        />
        {error && <FieldError role="alert">{error}</FieldError>}
        <DialogFooter>
          <Button variant="outline" onClick={() => changeOpen(false)}>
            {labels.cancel}
          </Button>
          <Button disabled={files.length === 0} loading={pending} onClick={onSubmit}>
            {labels.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
