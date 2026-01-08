import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from '@/locales/en.json'
import uk from '@/locales/uk.json'
import ru from '@/locales/ru.json'

export const supportedLanguages = ['en', 'uk', 'ru'] as const
export type SupportedLanguage = (typeof supportedLanguages)[number]

export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  uk: 'Українська',
  ru: 'Русский',
}

export const languageFlags: Record<SupportedLanguage, string> = {
  en: '🇬🇧',
  uk: '🇺🇦',
  ru: '🇷🇺',
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      uk: { translation: uk },
      ru: { translation: ru },
    },
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'weqory_language',
    },
  })

export default i18n
