import { queryOptions } from '@tanstack/react-query';
import { defineApiContract } from '@/lib/http/contract';
import { http } from '@/lib/http/client';
import { logKeys } from './keys';
import {
  LoginLogResultSchema,
  OperationLogResultSchema,
  type LoginResult,
  type OperationType,
} from './schema';

const operationResultContract = defineApiContract({ response: OperationLogResultSchema });
const loginResultContract = defineApiContract({ response: LoginLogResultSchema });

export const operationLogsQuery = (
  keyword: string,
  type: OperationType,
  startDate: string,
  endDate: string,
) =>
  queryOptions({
    queryKey: logKeys.operations(keyword, type, startDate, endDate),
    queryFn: ({ signal }) =>
      http.get('/api/audit/operation-logs', { keyword, type, startDate, endDate }, operationResultContract, {
        signal,
      }),
  });

export const loginLogsQuery = (keyword: string, result: LoginResult, startDate: string, endDate: string) =>
  queryOptions({
    queryKey: logKeys.logins(keyword, result, startDate, endDate),
    queryFn: ({ signal }) =>
      http.get('/api/audit/login-logs', { keyword, result, startDate, endDate }, loginResultContract, {
        signal,
      }),
  });
