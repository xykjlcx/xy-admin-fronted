// 错误类型拆开是为了让 Query、路由守卫和页面能按失败性质处理：
// HTTP/网络失败、登录过期、业务失败、接口契约漂移不应该走同一套兜底逻辑。
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

export class ContractError extends Error {
  issues: unknown;
  constructor(message: string, issues: unknown, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ContractError';
    this.issues = issues;
  }
}
