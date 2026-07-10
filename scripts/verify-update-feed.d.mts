export function verifyPublicUpdateFeed(input: {
  feedUrl: string;
  metadataName: 'latest-mac.yml' | 'latest.yml';
  fetchImpl?: typeof fetch;
}): Promise<{ version: unknown; artifact: string; bytes: number; sha512: string }>;
