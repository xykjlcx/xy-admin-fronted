export interface RendererArtifactResult {
  target: 'web' | 'desktop';
  totalBytes: number;
  largestJavaScriptBytes: number;
  fileCount: number;
}

export function verifyRendererArtifacts(root: string, target: 'web' | 'desktop'): RendererArtifactResult;
