import { useAppSelector } from '../../app/store/hooks'
import { useAppTranslation } from '../../hooks/useAppTranslation'
import {
  channelSliceSelectors,
  TNewChannelForm,
} from '../../slices/channel/channel.slice'

interface Props {
  error?: string
  onBack: VoidFunction
  onNext: VoidFunction
  feeRates: Record<string, number>
}

const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatPubKey = (pubKey: string) => {
  if (!pubKey) return ''
  return `${pubKey.slice(0, 8)}...${pubKey.slice(-8)}`
}

export const Step3 = (props: Props) => {
  const { t } = useAppTranslation('createNewChannel')

  const newChannelForm = useAppSelector(
    (state) => channelSliceSelectors.form(state, 'new') as TNewChannelForm
  )
  const [pubKey, address] = newChannelForm.pubKeyAndAddress?.split('@') ?? []

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-10">
        <h3 className="text-3xl font-bold text-white mb-4">
          {t('steps.step3.title')}
        </h3>
        <p className="text-gray-400">{t('steps.step3.subtitle')}</p>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 space-y-8">
        {/* Channel Capacity Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">
            {t('steps.step3.capacity.label')}
          </h4>
          <div className="bg-gray-900/50 p-6 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-400">
              {formatNumber(newChannelForm.capacitySat)} SAT
            </div>
            {newChannelForm.assetAmount > 0 && (
              <div className="mt-2 text-lg text-gray-400">
                {newChannelForm.assetAmount} {newChannelForm.assetTicker}
              </div>
            )}
          </div>
        </div>

        {/* Node Connection Details */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">
            {t('steps.step3.node.title')}
          </h4>
          <div className="bg-gray-900/50 p-6 rounded-lg space-y-4">
            <div>
              <span className="text-gray-400 text-sm">Node ID:</span>
              <div className="font-mono text-sm break-all mt-1">
                <span className="text-white">{pubKey}</span>
                <button
                  className="ml-2 text-blue-400 hover:text-blue-300 text-xs"
                  onClick={() => navigator.clipboard.writeText(pubKey)}
                  title={t('steps.step3.node.copyPubkey')}
                  type="button"
                >
                  {formatPubKey(pubKey)} ({t('steps.step3.node.copyPubkey')})
                </button>
              </div>
            </div>
            <div>
              <span className="text-gray-400 text-sm">
                t('steps.step3.node.host')
              </span>
              <div className="font-mono text-sm break-all mt-1">
                <span className="text-white">{address}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Rate Info */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">
            {t('steps.step3.fee.title')}
          </h4>
          <div className="bg-gray-900/50 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-400">
                  {t('steps.step3.fee.selectedRate')}
                </div>
                <div className="text-lg font-medium text-white mt-1">
                  {newChannelForm.fee.charAt(0).toUpperCase() +
                    newChannelForm.fee.slice(1)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-400">
                  {t('steps.step3.fee.feeRate')}
                </div>
                <div className="text-lg font-medium text-white mt-1">
                  {props.feeRates && props.feeRates[newChannelForm.fee]
                    ? `${props.feeRates[newChannelForm.fee] / 1000} sat/vB`
                    : t('steps.step3.fee.loading')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          className="px-8 py-3 rounded-lg text-lg font-bold
            bg-gray-700 hover:bg-gray-600 text-gray-300
            transform transition-all duration-200
            focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50
            shadow-md hover:shadow-lg
            flex items-center"
          onClick={props.onBack}
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M15 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          {t('steps.common.back')}
        </button>

        <button
          className="px-8 py-3 rounded-lg text-lg font-bold text-white
            bg-blue-600 hover:bg-blue-700
            transform transition-all duration-200
            focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            shadow-lg hover:shadow-xl
            flex items-center"
          onClick={props.onNext}
        >
          {t('steps.common.confirm')}
          <svg
            className="w-5 h-5 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M5 13l4 4L19 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </button>
      </div>

      {props.error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
          {props.error}
        </div>
      )}
    </div>
  )
}
