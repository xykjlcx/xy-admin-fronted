export const companyKeys = {
  all: ['system', 'company'] as const,
  detail: () => ['system', 'company', 'detail'] as const,
};
