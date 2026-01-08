import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

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

// Safely detect language
function detectLanguage(): string {
  try {
    // Try localStorage first
    const stored = localStorage.getItem('weqory_language')
    if (stored && ['en', 'uk', 'ru'].includes(stored)) {
      return stored
    }
    // Try navigator language
    const navLang = navigator.language?.slice(0, 2)
    if (navLang && ['en', 'uk', 'ru'].includes(navLang)) {
      return navLang
    }
  } catch {
    // Ignore errors (e.g., localStorage not available)
  }
  return 'en'
}

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      uk: { translation: uk },
      ru: { translation: ru },
    },
    lng: detectLanguage(),
    fallbackLng: 'en',
    supportedLngs: ['en', 'uk', 'ru'],
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense to prevent loading issues
    },
  })

export default i18n
