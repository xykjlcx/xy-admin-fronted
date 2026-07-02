import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCommon from '@/locales/zh-CN/common.json';
import zhAdmin from '@/locales/zh-CN/admin.json';
import enCommon from '@/locales/en-US/common.json';
import enAdmin from '@/locales/en-US/admin.json';

export const i18nInit = i18n.use(initReactI18next).init({
  lng: localStorage.getItem('locale') ?? 'zh-CN',
  fallbackLng: 'zh-CN',
  resources: {
    'zh-CN': { common: zhCommon, admin: zhAdmin },
    'en-US': { common: enCommon, admin: enAdmin },
  },
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});
