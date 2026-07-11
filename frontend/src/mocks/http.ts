import { HttpResponse, type JsonBodyType } from 'msw';

const HTTP_TITLES: Readonly<Record<number, string>> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

interface BizInput {
  status: number;
  code: string;
  detail: string;
  extensions?: Readonly<Record<string, unknown>>;
}

export const ok = <T extends JsonBodyType>(data: T) => HttpResponse.json(data);

export const noContent = () => new HttpResponse(null, { status: 204 });

export const biz = ({ status, code, detail, extensions }: BizInput) =>
  HttpResponse.json(
    {
      ...extensions,
      type: 'about:blank',
      title: HTTP_TITLES[status] ?? 'Error',
      status,
      detail,
      code,
      traceId: crypto.randomUUID(),
    },
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
