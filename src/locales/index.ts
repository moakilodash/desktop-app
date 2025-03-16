// Define the supported languages
const LANGUAGES = ['en', 'it'] as const
type Language = (typeof LANGUAGES)[number]

// Define the components that are to be translated
const COMPONENTS = [
  'AssetSelector',
  'BackupModal',
  'ChannelCard',
  'Layout',
  'LiquidityBar',
  'Loader',
  'MnemonicDisplay',
  'MnemonicVerifyForm',
  'Modal',
  'PasswordSetupForm',
  'Select',
  'Spinner',
  'StatusToast',
  'SuccessCheckmark',
  'SwapConfirmation',
  'SwapRecap',
  'Toolbar',
  'Trade',
  'UnlockProgress',
] as const

// Define the routes that are to be translated
const ROUTES = [
  'channels',
  'create-new-channel',
  'createUtxos',
  'order-new-channel',
  'root',
  'settings',
  'trade',
  'wallet-dashboard',
  'wallet-history',
  'wallet-init',
  'wallet-remote',
  'wallet-restore',
  'wallet-setup',
  'wallet-unlock',
] as const

// Import all the translation files using import.meta.glob
const translationFiles = import.meta.glob('./**/*.json', { eager: true })

// Helper function to extract content from an imported form
function getTranslationContent(module: any) {
  return module.default || module
}

// Helper function to load translations
function loadTranslations(language: Language) {
  // Load components
  const components = Object.fromEntries(
    COMPONENTS.map((component) => {
      const path = `./${language}/components/${component}.json`
      const translation = translationFiles[path]
      if (!translation) {
        throw new Error(`Translation file not found: ${path}`)
      }
      return [component, getTranslationContent(translation)]
    })
  )

  // Load the routes
  const routes = Object.fromEntries(
    ROUTES.map((route) => {
      const path = `./${language}/routes/${route}.json`
      const translation = translationFiles[path]
      if (!translation) {
        throw new Error(`Translation file not found: ${path}`)
      }
      return [
        // Convert the file name to camelCase for the key name
        route.replace(/-./g, (x) => x[1].toUpperCase()),
        getTranslationContent(translation),
      ]
    })
  )

  // Load the common files
  const commonPath = `./${language}/common.json`
  const helpersPath = `./${language}/helpers.json`

  const common = translationFiles[commonPath]
  const helpers = translationFiles[helpersPath]

  if (!common || !helpers) {
    throw new Error(`Missing common files for language ${language}`)
  }

  return {
    ...routes,
    common: getTranslationContent(common),
    components,
    helpers: getTranslationContent(helpers),
  }
}

// Create the resources object
const resources = Object.fromEntries(
  LANGUAGES.map((language) => [language, loadTranslations(language)])
)

// Add type safety
type Resources = typeof resources
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: Resources
  }
}

// Add basic validation during development
if (import.meta.env.DEV) {
  console.log('Checking translation completeness...')
  const englishKeys = JSON.stringify(resources.en)
  LANGUAGES.forEach((lang) => {
    if (lang === 'en') return
    const langKeys = JSON.stringify(resources[lang])
    if (englishKeys !== langKeys) {
      console.warn(
        `Warning: Translation keys for ${lang} don't match English keys`
      )
    }
  })
}

export { resources }
