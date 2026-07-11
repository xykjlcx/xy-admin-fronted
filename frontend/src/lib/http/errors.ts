export interface BizErrorDetails {
  status: number;
  code: string;
  detail: string;
  traceId: string | null;
  instance: string | null;
  retryAfter: number | null;
}

export class BizError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly traceId: string | null;
  readonly instance: string | null;
  readonly retryAfter: number | null;

  constructor(details: BizErrorDetails, options?: ErrorOptions) {
    super(details.detail, options);
    this.name = 'BizError';
    this.status = details.status;
    this.code = details.code;
    this.detail = details.detail;
    this.traceId = details.traceId;
    this.instance = details.instance;
    this.retryAfter = details.retryAfter;
  }
}
export class AuthExpiredError extends Error {
  name = 'AuthExpiredError';
}
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'HttpError';
    this.status = status;
  }
}

export class ContractError extends Error {
  issues: unknown;
  constructor(message: string, issues: unknown, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ContractError';
    this.issues = issues;
  }
}
