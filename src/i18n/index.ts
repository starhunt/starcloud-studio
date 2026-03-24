import { ko, type TranslationKeys } from './ko';
import { en } from './en';

export type SupportedLocale = 'ko' | 'en' | 'auto';

const translations: Record<string, TranslationKeys> = { ko, en };

let currentLocale: SupportedLocale = 'auto';
let detectedLocale: string = 'ko';

/**
 * Obsidian에서 감지된 로케일을 설정
 */
export function setDetectedLocale(locale: string) {
  // 'ko-KR' -> 'ko', 'en-US' -> 'en' 등 언어 코드 추출
  const lang = locale.split('-')[0].split('_')[0].toLowerCase();
  detectedLocale = lang;
}

/**
 * 사용자가 선택한 로케일을 설정
 */
export function setLocale(locale: SupportedLocale) {
  currentLocale = locale;
}

/**
 * 현재 유효한 로케일 반환
 */
function getEffectiveLocale(): string {
  if (currentLocale !== 'auto') {
    return currentLocale;
  }
  return detectedLocale;
}

/**
 * 번역 객체를 반환
 * 사용법: t().settings.title, t().notice.configureApiKey('OpenAI')
 */
export function t(): TranslationKeys {
  const locale = getEffectiveLocale();
  return translations[locale] || translations['en'];
}
