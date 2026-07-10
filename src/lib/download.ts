interface DownloadFileOptions {
  signal?: AbortSignal;
}

export async function downloadFile(url: string, filename: string, options: DownloadFileOptions = {}) {
  const response = options.signal ? await fetch(url, { signal: options.signal }) : await fetch(url);
  if (!response.ok) throw new Error(`Download failed with status ${response.status}`);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  return blob.size;
}
