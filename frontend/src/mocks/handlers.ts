// 全部 mock handlers 的聚合点；browser.ts 只依赖本文件，不直接罗列各域 handlers
import { authHandlers } from '@/modules/admin/auth/mocks';
import { dashboardHandlers } from '@/modules/admin/mocks/dashboard.handlers';
import { menuHandlers } from '@/modules/admin/menus/mocks';
import { roleHandlers } from '@/modules/admin/roles/mocks';
import { usersModuleHandlers } from '@/modules/admin/users/mocks';
import { dictionaryHandlers } from '@/modules/admin/dictionaries/mocks';
import { messageHandlers } from '@/modules/admin/messages/mocks';
import { logHandlers } from '@/modules/admin/logs/mocks';
import { fileHandlers } from '@/modules/admin/files/mocks';
import { companyHandlers } from '@/modules/admin/company/mocks';
import { profileHandlers } from '@/modules/admin/profile/mocks';
import { overviewHandlers } from '@/modules/lastmile/overview/mocks';
import { shipmentHandlers } from '@/modules/lastmile/shipments/mocks';
import { customerHandlers } from '@/modules/lastmile/customers/mocks';
import { channelHandlers } from '@/modules/lastmile/channels/mocks';
import { carrierHandlers } from '@/modules/lastmile/carriers/mocks';
import { supplierHandlers } from '@/modules/lastmile/suppliers/mocks';
import { billingHandlers } from '@/modules/lastmile/billing/mocks';

export const allHandlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...menuHandlers,
  ...usersModuleHandlers,
  ...roleHandlers,
  ...dictionaryHandlers,
  ...messageHandlers,
  ...logHandlers,
  ...fileHandlers,
  ...companyHandlers,
  ...profileHandlers,
  ...overviewHandlers,
  ...shipmentHandlers,
  ...customerHandlers,
  ...channelHandlers,
  ...carrierHandlers,
  ...supplierHandlers,
  ...billingHandlers,
];
