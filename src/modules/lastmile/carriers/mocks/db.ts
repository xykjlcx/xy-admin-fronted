import type { CarrierDto } from '../api';
type CarrierSeed = readonly [
  id: string,
  code: string,
  name: string,
  fullName: string,
  region: string,
  serviceName: string,
  serviceCode: string,
];
const seed: readonly CarrierSeed[] = [
  ['car-001', 'DHL', 'DHL', 'DHL Paket GmbH', '欧洲 · 全球', 'DHL Paket', 'DHL-PK'],
  ['car-002', 'DPD', 'DPD', 'DPD Deutschland GmbH', '欧洲', 'DPD Classic', 'DPD-CL'],
  ['car-003', 'GLS', 'GLS', 'General Logistics Systems', '欧洲', 'GLS Business', 'GLS-BS'],
  ['car-004', 'UPS', 'UPS', 'United Parcel Service', '全球', 'UPS Standard', 'UPS-ST'],
  ['car-005', 'SF', '顺丰', '顺丰速运', '中国 · 欧洲', '欧洲专递', 'SF-EU'],
  ['car-006', 'SELF', '自营', '企业自营配送', '德国 · 英国', '自建配送', 'SELF-EU'],
];
function make(row: CarrierSeed): CarrierDto {
  const [id, code, name, fullName, region, serviceName, serviceCode] = row;
  return {
    id,
    code,
    name,
    fullName,
    region,
    enabled: true,
    services: [{ id: `${id}-srv`, name: serviceName, code: serviceCode, tracking: true, labelFormat: 'PDF' }],
    channels: [
      {
        id: `${id}-ch`,
        name: `${name} 标准渠道`,
        code: `${code}-STD`,
        supplier: name === 'DHL' ? 'DHL 官方' : '新智慧',
        enabled: true,
      },
    ],
  };
}
let data = seed.map(make);
export const carrierDb = {
  all: () => data,
  find: (id: string) => data.find((item) => item.id === id),
  add: (item: CarrierDto) => {
    data = [item, ...data];
  },
  reset: () => {
    data = seed.map(make);
  },
};
