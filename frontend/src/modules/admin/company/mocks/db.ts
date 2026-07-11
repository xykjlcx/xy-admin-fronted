import { createCollection } from '@/mocks/db';
import type { CompanyDto } from '../api';

export const companies = createCollection<CompanyDto, 'id'>(
  [
    {
      id: 'company-1',
      name: '小倪科技',
      verified: false,
      domain: 'g05t3iydj2i.example.cn',
      code: 'FM4BG629BGE',
      industry: '软件和信息技术 / 垂直行业应用',
      scale: '100-499 人',
      dataResidency: '中国大陆',
      createdAt: '2020-01-15',
      contactName: '李长昕',
      contactEmail: 'lichangxin@xinyue.com',
      contactPhone: '+86 158 0611 9676',
      landline: '021-8866 2200',
      address: '上海市浦东新区张江路 88 号',
      postalCode: '201203',
    },
  ],
  'id',
);
