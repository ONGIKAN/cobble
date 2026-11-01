import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { zhCN } from './locales/zh-CN';
import { en } from './locales/en';

export type Locale = 'zh-CN' | 'en';
export const SUPPORTED_LOCALES: readonly Locale[] = ['zh-CN', 'en'];
export const LOCALE_STORAGE_KEY = 'cobbox.locale';

export type TFunc = (key: string, options?: Record<string, unknown>) => string;

export function detectLocale(): Locale {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'zh-CN' || stored === 'en') return stored;
  }
  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (const lang of langs) {
      if (!lang) continue;
      const lower = lang.toLowerCase();
      if (lower.startsWith('zh')) return 'zh-CN';
      if (lower.startsWith('en')) return 'en';
    }
  }
  return 'zh-CN';
}

export function initI18n(locale: Locale = detectLocale()): typeof i18next {
  if (i18next.isInitialized) {
    if (i18next.language !== locale) void i18next.changeLanguage(locale);
    return i18next;
  }
  void i18next.use(initReactI18next).init({
    lng: locale,
    fallbackLng: 'zh-CN',
    supportedLngs: [...SUPPORTED_LOCALES],
    resources: {
      'zh-CN': { translation: zhCN },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
    react: { useSuspense: false },
  });
  return i18next;
}

export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // 无痕模式等场景下忽略
  }
}

/** 切换界面语言：Blockly/Themed 组件语言无法热替换，保存后整页重载最稳 */
export function switchLocale(locale: Locale): void {
  persistLocale(locale);
  location.reload();
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options) as string;
}
