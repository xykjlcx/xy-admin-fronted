export class BizError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.name = 'BizError';
    this.code = code;
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
