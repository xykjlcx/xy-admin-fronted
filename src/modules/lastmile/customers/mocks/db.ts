import type { CustomerDto } from '../api';

const baseChannels = [
  { id: 'ch-001', name: '新智慧-DPD德国标准', code: 'XZH-DPD-DE-STD', carrier: 'DPD', authorized: true },
  { id: 'ch-002', name: 'DHL官方-德国小包', code: 'DHL-OFF-DE-PK', carrier: 'DHL', authorized: true },
  { id: 'ch-003', name: '递四方-GLS欧洲经济', code: '4PX-GLS-EU-ECO', carrier: 'GLS', authorized: true },
];
type CustomerSeed = readonly [
  id: string,
  name: string,
  code: string,
  type: string,
  pricingPlan: string,
  balance: number,
  credit: number,
  status: CustomerDto['status'],
];
const seed: readonly CustomerSeed[] = [
  ['c-001', '德坤海外仓', 'C-DKHW', '海外仓', '德坤专属价', 12840, 20000, 'active'],
  ['c-002', '深圳跨境优选', 'C-SZKJ', '跨境卖家', '标准价 A', 3260, 8000, 'active'],
  ['c-003', '欧凯家居', 'C-OCJJ', '跨境卖家', '标准价 A', -1580, 5000, 'overdue'],
  ['c-004', '跨境小马哥', 'C-KJXM', '小货代', '尾程特惠价', 920, 3000, 'trial'],
  ['c-005', '银河优品', 'C-YHYP', '跨境卖家', '标准价 B', 0, 2000, 'suspended'],
  ['c-006', '欧盟直发工厂', 'C-OZGC', '工厂客户', '工厂协议价', 26400, 50000, 'active'],
];
function make(row: CustomerSeed): CustomerDto {
  const [id, name, code, type, pricingPlan, balance, credit, status] = row;
  return {
    id,
    name,
    code,
    type,
    pricingPlan,
    balance,
    credit,
    status,
    contact: '王先生',
    phone: '+86 138 8888 6666',
    email: `${code.toLowerCase()}@client.com`,
    registeredAt: '2025-08-12',
    channels: baseChannels.map((channel, index) => ({
      ...channel,
      authorized: index < (id === 'c-004' ? 1 : 3),
    })),
    priceRows: [
      { channel: 'DHL Paket', weightRange: '0-1kg', base: 58, markup: 8, final: 62.6 },
      { channel: 'DPD Classic', weightRange: '0-1kg', base: 48, markup: 10, final: 52.8 },
      { channel: 'GLS Business', weightRange: '0-1kg', base: 64, markup: 6, final: 67.8 },
    ],
    transactions: [
      {
        id: `${id}-tx1`,
        occurredAt: '2026-06-30 14:22',
        type: 'charge',
        description: '运单 MM26063001 扣款',
        amount: -58,
        balance,
      },
      {
        id: `${id}-tx2`,
        occurredAt: '2026-06-28 09:10',
        type: 'recharge',
        description: '银行转账充值',
        amount: 10000,
        balance: balance + 58,
      },
    ],
  };
}
let data = seed.map(make);
export const customerDb = {
  all: () => data,
  find: (id: string) => data.find((item) => item.id === id),
  add: (item: CustomerDto) => {
    data = [item, ...data];
  },
  update: (id: string, updater: (item: CustomerDto) => CustomerDto) => {
    data = data.map((item) => (item.id === id ? updater(item) : item));
    return data.find((item) => item.id === id);
  },
  reset: () => {
    data = seed.map(make);
  },
};
export { baseChannels };
