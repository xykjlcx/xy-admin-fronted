import { createCollection } from '@/mocks/db';
import type { LoginDeviceDto, PreferenceDto, ProfileDto, SecuritySettingsDto } from '../api';

export const profiles = createCollection<ProfileDto, 'id'>(
  [
    {
      id: 'u1',
      name: '李长昕',
      email: 'leah@acme.com',
      phone: '+86 158 0611 9676',
      company: '昕越科技',
      department: '产品中心',
      role: '超级管理员',
      location: '北京 · 朝阳区',
      employeeNo: 'E-00142',
      title: '首席产品官',
      joinedAt: '2021-03-15',
      manager: '王小明',
      language: '中文 / English',
      timezone: 'Asia/Shanghai (GMT+8)',
      bio: '带领产品团队打磨协同、HR 与物流三条产品线。过去十年在 B 端软件与大型 SaaS 做产品架构。',
      emailVerified: true,
      lastActive: '今天 14:22',
    },
  ],
  'id',
);
export const securitySettings = createCollection<SecuritySettingsDto & { id: string }, 'id'>(
  [{ id: 'security-u1', twoFactor: true, emailAlert: true, newDeviceAlert: false }],
  'id',
);
export const preferences = createCollection<PreferenceDto & { id: string }, 'id'>(
  [
    {
      id: 'preference-u1',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      weeklyDigest: true,
      compactNotifications: false,
    },
  ],
  'id',
);
export const loginDevices = createCollection<LoginDeviceDto, 'id'>(
  [
    {
      id: 'device-current',
      name: 'Chrome · macOS',
      location: '上海市',
      ip: '112.65.32.18',
      lastActive: '当前在线',
      current: true,
    },
    {
      id: 'device-2',
      name: '飞书客户端 · Windows',
      location: '上海市',
      ip: '112.65.32.44',
      lastActive: '2 小时前',
      current: false,
    },
    {
      id: 'device-3',
      name: 'Safari · iOS',
      location: '深圳市',
      ip: '59.82.11.203',
      lastActive: '3 天前',
      current: false,
    },
  ],
  'id',
);
export const passwords = createCollection([{ id: 'u1', value: 'password123' }], 'id');
