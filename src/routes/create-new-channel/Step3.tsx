import { useMemo } from 'react'

import { TNewChannelForm } from '../../slices/channel/channel.slice'

interface Props {
  error?: string
  onBack: VoidFunction
  onNext: VoidFunction
  feeRates: Record<string, number>
  formData: TNewChannelForm
  onFormUpdate: (updates: Partial<TNewChannelForm>) => void
}

const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatPubKey = (pubKey: string) => {
  if (!pubKey) return ''
  return `${pubKey.slice(0, 8)}...${pubKey.slice(-8)}`
}

export const Step3 = ({ error, onBack, onNext, feeRates, formData }: Props) => {
  // Parse the peer connection string using useMemo to persist the values
  const connectionDetails = useMemo(() => {
    const [pubKey = '', hostAddress = ''] = formData.pubKeyAndAddress?.split(
      '@'
    ) ?? ['', '']
    const [host = '', port = ''] = hostAddress?.split(':') ?? ['', '']

    return { host, port, pubKey }
  }, [formData.pubKeyAndAddress])

  // Validate if we have the required data
  const hasValidNodeInfo = useMemo(() => {
    const isValid = !!(
      connectionDetails.pubKey &&
      connectionDetails.host &&
      connectionDetails.port &&
      formData.pubKeyAndAddress
    )

    return isValid
  }, [connectionDetails, formData.pubKeyAndAddress])

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-10">
        <h3 className="text-3xl font-bold text-white mb-4">
          Open a Channel - Step 3
        </h3>
        <p className="text-gray-400">Review and confirm your channel details</p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-center">
          {error}
        </div>
      )}

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 space-y-8">
        {/* Channel Capacity Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">
            Channel Capacity
          </h4>
          <div className="bg-gray-900/50 p-6 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-400">
              {formatNumber(formData.capacitySat)} SAT
            </div>
            {formData.assetAmount > 0 && (
              <div className="mt-2 text-lg text-gray-400">
                {formData.assetAmount} {formData.assetTicker}
              </div>
            )}
          </div>
        </div>

        {/* Node Connection Details */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">
            Connected Node
          </h4>
          <div className="bg-gray-900/50 p-6 rounded-lg space-y-4">
            {hasValidNodeInfo ? (
              <>
                <div>
                  <span className="text-gray-400 text-sm">Node ID:</span>
                  <div className="font-mono text-sm break-all mt-1">
                    <span className="text-white">
                      {connectionDetails.pubKey}
                    </span>
                    <button
                      className="ml-2 text-blue-400 hover:text-blue-300 text-xs"
                      onClick={() =>
                        navigator.clipboard.writeText(connectionDetails.pubKey)
                      }
                      title="Copy full pubkey"
                      type="button"
                    >
                      {formatPubKey(connectionDetails.pubKey)} (click to copy)
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Host:</span>
                  <div className="font-mono text-sm break-all mt-1">
                    <span className="text-white">{connectionDetails.host}</span>
                    <span className="text-white">
                      :{connectionDetails.port}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-red-500">
                Please go back and enter valid node connection information
              </div>
            )}
          </div>
        </div>

        {/* Fee Rate Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">
            Transaction Fee Rate
          </h4>
          <div className="bg-gray-900/50 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-white capitalize">{formData.fee}</span>
              <span className="text-gray-400">
                {feeRates[formData.fee] / 1000} sat/vB
              </span>
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
          onClick={onBack}
          type="button"
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
          Back
        </button>

        <button
          className="px-8 py-3 rounded-lg text-lg font-bold text-white
            bg-blue-600 hover:bg-blue-700
            transform transition-all duration-200
            focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            shadow-lg hover:shadow-xl
            flex items-center"
          disabled={!hasValidNodeInfo}
          onClick={onNext}
          type="button"
        >
          Open Channel
          <svg
            className="w-5 h-5 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 5l7 7-7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
