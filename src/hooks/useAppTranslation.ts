import { useTranslation } from 'react-i18next'

import type { TranslationNamespace, TranslationType } from '../types/i18n'

export const useAppTranslation = <N extends TranslationNamespace>(
  namespace: N
) => {
  return useTranslation<string, TranslationType<N>>(namespace)
}
