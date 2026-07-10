import { http } from 'msw';
import { ok } from '@/mocks/http';
import { overviewData } from './db';

export const overviewHandlers = [http.get('/api/lastmile/overview', () => ok(overviewData))];
