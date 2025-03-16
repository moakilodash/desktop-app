import { useAppTranslation } from '../../hooks/useAppTranslation'

export const FormError = () => {
  const { t } = useAppTranslation('orderNewChannel')

  return <div className="flex justify-end text-red mt-4">{t('form.error')}</div>
}
