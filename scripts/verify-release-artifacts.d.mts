export interface VerifyUpdateMetadataInput {
  metadataPath: string;
  releaseRoot: string;
  platform: 'darwin' | 'win32';
  arch: 'arm64' | 'x64';
  expectedVersion: string;
}

export function verifyPackagedArchive(
  asarPath: string,
  expectedVersion: string,
): { fileCount: number; archiveSize: number; version: string };
export function verifyUpdateMetadata(input: VerifyUpdateMetadataInput): {
  updateArtifact: string;
  artifactCount: number;
  artifacts: Array<{ filename: string; path: string; size: number; sha512: string }>;
  metadata: Record<string, unknown>;
};
export function stageAndVerifyUpdateFeed(
  input: Omit<VerifyUpdateMetadataInput, 'metadataPath'> & { feedRoot: string },
): { feedDirectory: string; files: string[] };
export function assertWindowsSignatureEvidence(
  evidence: { status: string; subject: string | null },
  options: { releaseBuild: boolean; expectedPublisher: string | null },
): { signature: 'authenticode' | 'unsigned'; publisher: string | null };
