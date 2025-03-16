import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import resources from './locales'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: import.meta.env.DEV,
    defaultNS: 'settings',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    resources, // Enable debugging only in development
  })

export { i18n }
