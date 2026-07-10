import { useState, type DragEvent } from 'react';
import { FileUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface FileDropzoneProps {
  label: string;
  hint: string;
  inputLabel: string;
  files: File[];
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}

export function FileDropzone({ label, hint, inputLabel, files, accept, multiple = false, disabled, onFiles }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const select = (next: FileList | null) => onFiles(next ? Array.from(next) : []);
  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) select(event.dataTransfer.files);
  };

  return (
    <label
      data-slot="file-dropzone"
      data-state={dragging ? 'dragging' : 'idle'}
      className={cn(
        'flex min-h-[calc(180px*var(--app-scale))] cursor-pointer flex-col items-center justify-center gap-3 rounded-12 border-2 border-dashed border-(--field-border) bg-(--field-bg) p-6 text-center text-(--field-fg) transition-colors',
        'hover:border-(--field-border-hover) hover:bg-(--field-bg-focus)',
        'data-[state=dragging]:border-(--field-border-hover) data-[state=dragging]:bg-(--field-bg-focus)',
        'has-[:focus-visible]:ring-[length:var(--focus-ring)] has-[:focus-visible]:ring-(--field-ring-focus)',
        disabled && 'pointer-events-none opacity-50',
      )}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
    >
      <FileUp className="size-[calc(40px*var(--app-scale))] text-(--field-border-hover)" />
      <span className="text-sm font-medium">{files.length ? files.map((file) => file.name).join(', ') : label}</span>
      <span className="text-xs text-(--field-placeholder)">{hint}</span>
      <Input className="sr-only" type="file" aria-label={inputLabel} accept={accept} multiple={multiple} disabled={disabled} onChange={(event) => select(event.target.files)} />
    </label>
  );
}
