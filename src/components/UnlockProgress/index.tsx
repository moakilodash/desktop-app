import { Loader2, ChevronLeft, AlertCircle, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { UnlockRequest } from '../../slices/nodeApi/nodeApi.slice'

interface UnlockProgressProps {
  unlockParams: UnlockRequest
  onUnlockComplete: () => void
  onUnlockError: (error: Error) => void
  onBack: () => void
}

export const UnlockProgress = ({
  unlockParams: initialUnlockParams,
  onUnlockComplete,
  onUnlockError,
  onBack,
}: UnlockProgressProps) => {
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm<UnlockRequest>({
    defaultValues: initialUnlockParams,
  })

  const startUnlock = async () => {
    setIsUnlocking(true)
    setError(null)
    try {
      await onUnlockComplete()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to unlock wallet'
      )
      onUnlockError(
        error instanceof Error ? error : new Error('Failed to unlock wallet')
      )
      setIsEditing(true) // Enable editing on error
    } finally {
      setIsUnlocking(false)
    }
  }

  return (
    <div className="max-w-2xl w-full mx-auto">
      {/* Header with Back Button */}
      <div className="flex justify-between mb-10">
        <button
          className="px-4 py-2 rounded-full border text-sm border-gray-500 hover:bg-gray-700 transition-colors flex items-center gap-2"
          disabled={isUnlocking}
          onClick={onBack}
          type="button"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      <div className="text-center mb-10">
        <h3 className="text-2xl font-semibold mb-4">Complete Your Setup</h3>
        <p className="text-gray-400">
          Review your connection details and unlock your RGB Lightning Node
        </p>
      </div>

      <form className="space-y-6" onSubmit={form.handleSubmit(startUnlock)}>
        {/* Connection Parameters Summary */}
        <div className="bg-blue-dark rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-medium">Connection Details</h4>
            {error && (
              <button
                className="text-sm text-cyan hover:text-cyan/80 transition-colors"
                onClick={() => setIsEditing(!isEditing)}
                type="button"
              >
                {isEditing ? 'Cancel Editing' : 'Edit Parameters'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {isEditing ? (
              // Editable fields when there's an error
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Bitcoin Node Host
                  </label>
                  <input
                    {...form.register('bitcoind_rpc_host')}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg"
                    disabled={isUnlocking}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Bitcoin Node Port
                  </label>
                  <input
                    {...form.register('bitcoind_rpc_port')}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg"
                    disabled={isUnlocking}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Indexer URL
                  </label>
                  <input
                    {...form.register('indexer_url')}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg"
                    disabled={isUnlocking}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    RGB Proxy Endpoint
                  </label>
                  <input
                    {...form.register('proxy_endpoint')}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg"
                    disabled={isUnlocking}
                  />
                </div>
              </>
            ) : (
              // Read-only summary view
              <div className="p-4 bg-gray-800/30 rounded-lg">
                <button
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  type="button"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      showAdvanced ? 'rotate-180' : ''
                    }`}
                  />
                  {showAdvanced ? 'Hide' : 'Show'} Connection Details
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-3 pt-4 border-t border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Bitcoin Node</span>
                      <span className="font-mono text-sm truncate ml-4 max-w-[300px]">
                        {initialUnlockParams.bitcoind_rpc_host}:
                        {initialUnlockParams.bitcoind_rpc_port}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">RPC Username</span>
                      <span className="font-mono text-sm truncate ml-4 max-w-[300px]">
                        {initialUnlockParams.bitcoind_rpc_username}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Indexer URL</span>
                      <span className="font-mono text-sm truncate ml-4 max-w-[300px]">
                        {initialUnlockParams.indexer_url}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">RGB Proxy</span>
                      <span className="font-mono text-sm truncate ml-4 max-w-[300px]">
                        {initialUnlockParams.proxy_endpoint}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-cyan to-purple 
                     text-white font-semibold hover:opacity-90 transition-all duration-200
                     focus:ring-2 focus:ring-cyan/20 focus:outline-none
                     flex items-center justify-center gap-2 disabled:opacity-50 
                     disabled:cursor-not-allowed"
            disabled={isUnlocking}
            type="submit"
          >
            {isUnlocking ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Unlocking Node...
              </>
            ) : (
              'Unlock Node'
            )}
          </button>
        </div>
      </form>

      {/* Full-screen Loading Overlay */}
      {isUnlocking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-blue-dark p-8 rounded-xl max-w-md w-full text-center">
            <Loader2 className="w-12 h-12 text-cyan animate-spin mx-auto mb-4" />
            <h4 className="text-xl font-bold mb-2">Unlocking Your Node</h4>
            <p className="text-gray-400">
              Please wait while we complete the setup of your RGB Lightning
              Node...
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
