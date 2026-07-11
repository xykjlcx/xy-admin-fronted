import type { OverviewDto } from '../api';

export const overviewData: OverviewDto = {
  stats: [
    { key: 'pending', value: '2', hint: '等待生成面单' },
    { key: 'transit', value: '2', hint: '在途包裹' },
    { key: 'todayFee', value: '¥582', hint: '较昨日 +8.4%' },
    { key: 'month', value: '12', hint: '较上月 +12%' },
  ],
  recent: [
    {
      id: 's-001',
      no: 'MM26063001',
      customer: '德坤海外仓',
      country: '德国 DE',
      channel: 'DHL Paket',
      status: 'pending',
    },
    {
      id: 's-002',
      no: 'MM26063002',
      customer: '深圳跨境优选',
      country: '法国 FR',
      channel: 'DPD Classic',
      status: 'pending',
    },
    {
      id: 's-003',
      no: 'MM26062905',
      customer: '欧凯家居',
      country: '德国 DE',
      channel: 'GLS Business',
      status: 'printed',
    },
    {
      id: 's-005',
      no: 'MM26062812',
      customer: '跨境小马哥',
      country: '英国 GB',
      channel: '自营尾程 EU',
      status: 'transit',
    },
    {
      id: 's-007',
      no: 'MM26062720',
      customer: '深圳跨境优选',
      country: '比利时 BE',
      channel: 'GLS Business',
      status: 'delivered',
    },
    {
      id: 's-009',
      no: 'MM26062709',
      customer: '跨境小马哥',
      country: '法国 FR',
      channel: 'DHL Paket',
      status: 'exception',
    },
  ],
  channelUsage: [
    { name: 'DHL Paket', count: 368, percent: 100 },
    { name: 'DPD Classic', count: 286, percent: 78 },
    { name: 'GLS Business', count: 224, percent: 61 },
    { name: '自营尾程 EU', count: 116, percent: 32 },
    { name: 'UPS Standard', count: 82, percent: 22 },
  ],
};
