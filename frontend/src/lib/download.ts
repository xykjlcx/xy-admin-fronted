import { http } from './http/client';
import { blobContract } from './http/contract';

export async function downloadFile(url: string, filename: string) {
  const result = await http.get(url, undefined, blobContract);
  const blob = result.blob;
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = result.filename ?? filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
