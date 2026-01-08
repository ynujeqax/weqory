import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { hapticFeedback } from '@telegram-apps/sdk'
import { supportedLanguages, languageNames, languageFlags, type SupportedLanguage } from '@/lib/i18n'

interface LanguageSwitcherProps {
  compact?: boolean
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const currentLanguage = (i18n.language?.slice(0, 2) || 'en') as SupportedLanguage
  const validLanguage = supportedLanguages.includes(currentLanguage) ? currentLanguage : 'en'

  const handleLanguageChange = (lang: SupportedLanguage) => {
    hapticFeedback.impactOccurred('light')
    i18n.changeLanguage(lang)
    setIsOpen(false)
  }

  const handleToggle = () => {
    hapticFeedback.impactOccurred('light')
    setIsOpen(!isOpen)
  }

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={handleToggle}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-elevated text-tg-text text-sm"
        >
          <span>{languageFlags[validLanguage]}</span>
          <span>{languageNames[validLanguage]}</span>
          <ChevronDown
            size={14}
            className={`text-tg-hint transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg bg-surface-elevated shadow-lg border border-white/10 overflow-hidden"
              >
                {supportedLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                      lang === validLanguage
                        ? 'bg-tg-button/20 text-tg-button'
                        : 'text-tg-text hover:bg-white/5'
                    }`}
                  >
                    <span>{languageFlags[lang]}</span>
                    <span className="flex-1 text-left">{languageNames[lang]}</span>
                    {lang === validLanguage && <Check size={14} />}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-body font-medium text-tg-text">{t('profile.settings.language')}</p>
          <p className="text-body-sm text-tg-hint">{t('profile.settings.languageHint')}</p>
        </div>

        <div className="relative">
          <button
            onClick={handleToggle}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-elevated text-tg-text text-sm min-w-[130px] justify-between"
          >
            <span className="flex items-center gap-2">
              <span>{languageFlags[validLanguage]}</span>
              <span>{languageNames[validLanguage]}</span>
            </span>
            <ChevronDown
              size={14}
              className={`text-tg-hint transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {isOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setIsOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg bg-surface-elevated shadow-lg border border-white/10 overflow-hidden"
                >
                  {supportedLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                        lang === validLanguage
                          ? 'bg-tg-button/20 text-tg-button'
                          : 'text-tg-text hover:bg-white/5'
                      }`}
                    >
                      <span>{languageFlags[lang]}</span>
                      <span className="flex-1 text-left">{languageNames[lang]}</span>
                      {lang === validLanguage && <Check size={14} />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
