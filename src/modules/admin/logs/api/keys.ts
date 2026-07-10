import type { LoginResult, OperationType } from './schema';

export const logKeys = {
  all: ['audit', 'logs'] as const,
  operations: (keyword: string, type: OperationType, startDate: string, endDate: string) =>
    [...logKeys.all, 'operations', { keyword, type, startDate, endDate }] as const,
  logins: (keyword: string, result: LoginResult, startDate: string, endDate: string) =>
    [...logKeys.all, 'logins', { keyword, result, startDate, endDate }] as const,
};
