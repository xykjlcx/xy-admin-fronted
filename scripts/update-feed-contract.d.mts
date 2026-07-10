export interface UpdateFeedHttpResponseEvidence {
  status: number;
  headers: Record<string, string | undefined>;
  bodyLength: number;
}

export interface UpdateFeedHttpEvidence {
  metadataGet: UpdateFeedHttpResponseEvidence;
  metadataHead: UpdateFeedHttpResponseEvidence;
  artifactHead: UpdateFeedHttpResponseEvidence;
  artifactRange: UpdateFeedHttpResponseEvidence;
}

export function assertUpdateFeedHttpContract(evidence: UpdateFeedHttpEvidence): void;
