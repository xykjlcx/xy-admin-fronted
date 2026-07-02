import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/lib/i18n-config';
import { resources } from '@/locales';

export const i18nInit = i18n.use(initReactI18next).init({
  lng: localStorage.getItem(LOCALE_STORAGE_KEY) || DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  resources,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});
