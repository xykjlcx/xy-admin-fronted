import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { UpdateCompanySchema } from '../api';
import { companies } from './db';

export const companyHandlers = [
  http.get('/api/company', () => ok(companies.all()[0])),
  http.put('/api/company', async ({ request }) => {
    const parsed = UpdateCompanySchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'company.validation.invalid', detail: '企业信息不完整' });
    return ok(companies.update('company-1', parsed.data));
  }),
];

export { companies } from './db';
