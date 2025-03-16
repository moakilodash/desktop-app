import { CheckCircle, XCircle, ArrowRight, RefreshCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { CHANNELS_PATH } from '../../app/router/paths'
import { useAppTranslation } from '../../hooks/useAppTranslation'

export const Step4 = ({ paymentStatus }: { paymentStatus: string }) => {
  const navigate = useNavigate()

  const { t } = useAppTranslation('orderNewChannel')

  const statusConfig = {
    failed: {
      buttonAction: () => navigate(CHANNELS_PATH),
      buttonText: t('step4.failure.button'),
      icon: <XCircle className="text-red-500 mb-4" size={64} />,
      message: t('step4.failure.message'),
      title: t('step4.failure.title'),
    },
    success: {
      buttonAction: () => navigate(CHANNELS_PATH),
      buttonText: t('step4.success.button'),
      icon: <CheckCircle className="text-green-500 mb-4" size={64} />,
      message: t('step4.success.message'),
      title: t('step4.success.title'),
    },
  }

  const config =
    statusConfig[paymentStatus as keyof typeof statusConfig] ||
    statusConfig.failed

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {config.icon}
        <h3 className="text-3xl font-bold mb-4">{config.title}</h3>
        <p className="text-lg text-gray-300 mb-6">{config.message}</p>
        {paymentStatus === 'success' && (
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-green-500 font-medium">
              {t('step4.success.progress')}
            </p>
          </div>
        )}
        <button
          className="px-6 py-3 rounded-lg text-lg font-bold bg-purple-600 hover:bg-purple-700 transition-colors w-full flex items-center justify-center"
          onClick={config.buttonAction}
        >
          {config.buttonText}
          {paymentStatus === 'success' ? (
            <ArrowRight className="ml-2" size={20} />
          ) : (
            <RefreshCcw className="ml-2" size={20} />
          )}
        </button>
      </div>
      {paymentStatus === 'failed' && (
        <button
          className="mt-4 text-gray-400 hover:text-white transition-colors"
          onClick={() => navigate(CHANNELS_PATH)}
        >
          {t('step4.failure.returnToTrade')}
        </button>
      )}
    </div>
  )
}
