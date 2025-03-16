import { useAppTranslation } from '../../hooks/useAppTranslation'

interface FormErrorProps {
  message?: string
  errors?: Record<string, string[]>
}

export const FormError = ({ message, errors }: FormErrorProps) => {
  const { t } = useAppTranslation('createNewChannel')

  return (
    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
      <p className="text-red-500 mb-2">
        {message || t('formError.defaultMessage')}
      </p>
      {errors && Object.entries(errors).length > 0 && (
        <ul className="list-disc list-inside">
          {Object.entries(errors).map(([field, messages]) => (
            <li className="text-red-400 text-sm" key={field}>
              {t('formError.fieldPrefix')}: {field}: {messages.join(', ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
