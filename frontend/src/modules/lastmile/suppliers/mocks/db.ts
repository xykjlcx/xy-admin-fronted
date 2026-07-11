import type { SupplierDto } from '../api';
type SupplierSeed = readonly [
  id: string,
  code: string,
  name: string,
  type: string,
  carriers: readonly string[],
  credentialLabel: string,
  settlement: string,
];
const seed: readonly SupplierSeed[] = [
  ['sup-001', 'XZH', '新智慧', '渠道聚合商', ['DHL', 'DPD'], '企业账号 · XZH-001', '月结'],
  ['sup-002', '4PX', '递四方', '渠道聚合商', ['GLS', 'DPD'], '企业账号 · 4PX-889', '预付'],
  ['sup-003', 'DHL-OFF', 'DHL 官方', '承运商官方', ['DHL'], '官方合同账号 · EKP', '官方账单'],
  ['sup-004', 'YT', '云途', '渠道聚合商', ['UPS'], '企业账号 · YT-660', '预付'],
  ['sup-005', 'SF-SUP', '顺丰', '承运商官方', ['顺丰'], '顺丰月结账号', '官方账单'],
  ['sup-006', 'SELF', '自营', '自营系统', ['自营'], '企业内部凭证', '内部结算'],
];
function make(row: SupplierSeed): SupplierDto {
  const [id, code, name, type, carriers, credentialLabel, settlement] = row;
  return {
    id,
    code,
    name,
    type,
    carriers: [...carriers],
    credentialLabel,
    baseUrl: `https://api.${code.toLowerCase()}.example.com/v1`,
    authType: 'API Key + Secret',
    settlement,
    enabled: true,
    latency: 286,
    mappings: carriers.map((carrier, index) => ({
      id: `${id}-map-${index}`,
      carrier,
      product: `${carrier} 产品线`,
      services: '标准 / 特快',
      tracking: true,
    })),
    channels: carriers.map((carrier, index) => ({
      id: `${id}-ch-${index}`,
      name: `${name}-${carrier} 标准`,
      code: `${code}-${carrier}-STD`,
      carrier,
      enabled: true,
    })),
  };
}
let data = seed.map(make);
export const supplierDb = {
  all: () => data,
  find: (id: string) => data.find((item) => item.id === id),
  add: (item: SupplierDto) => {
    data = [item, ...data];
  },
  reset: () => {
    data = seed.map(make);
  },
};
