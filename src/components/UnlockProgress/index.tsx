import { Loader2, AlertCircle, ChevronDown, ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { UnlockRequest } from '../../slices/nodeApi/nodeApi.slice'

interface UnlockProgressProps {
  unlockParams: UnlockRequest
  onUnlockComplete: () => void
  onUnlockError: (error: Error) => void
  onBack?: () => void
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
    <div className="w-full">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 rounded-xl bg-cyan/10 border border-cyan/20 text-cyan">
          {isUnlocking ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Loader2 className="w-5 h-5" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-white">Unlock Your Node</h2>
      </div>

      <p className="text-slate-400 mb-6 leading-relaxed">
        {isUnlocking
          ? 'Your node is being unlocked with the provided configuration. This may take a moment.'
          : 'Click the button below to unlock your node and start using your wallet.'}
      </p>

      <form className="space-y-5" onSubmit={form.handleSubmit(startUnlock)}>
        {/* Connection Parameters Summary */}
        <div className="bg-blue-dark/40 rounded-lg p-5 border border-white/5">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-base font-medium">Connection Details</h4>
            {error && (
              <button
                className="text-xs text-cyan hover:text-cyan/80 transition-colors"
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
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Bitcoin Node Host
                  </label>
                  <input
                    {...form.register('bitcoind_rpc_host')}
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                              bg-slate-800/30 text-slate-300 
                              focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                              outline-none transition-all"
                    disabled={isUnlocking}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Bitcoin Node Port
                    </label>
                    <input
                      {...form.register('bitcoind_rpc_port')}
                      className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                                bg-slate-800/30 text-slate-300 
                                focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                                outline-none transition-all"
                      disabled={isUnlocking}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      RPC Username
                    </label>
                    <input
                      {...form.register('bitcoind_rpc_username')}
                      className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                                bg-slate-800/30 text-slate-300 
                                focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                                outline-none transition-all"
                      disabled={isUnlocking}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Indexer URL
                  </label>
                  <input
                    {...form.register('indexer_url')}
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                              bg-slate-800/30 text-slate-300 
                              focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                              outline-none transition-all"
                    disabled={isUnlocking}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    RGB Proxy Endpoint
                  </label>
                  <input
                    {...form.register('proxy_endpoint')}
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                              bg-slate-800/30 text-slate-300 
                              focus:border-cyan focus:ring-2 focus:ring-cyan/20 
                              outline-none transition-all"
                    disabled={isUnlocking}
                  />
                </div>
              </>
            ) : (
              // Read-only summary view
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <button
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors w-full"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  type="button"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      showAdvanced ? 'rotate-180' : ''
                    }`}
                  />
                  {showAdvanced ? 'Hide' : 'Show'} Connection Details
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-2 pt-3 border-t border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">
                        Bitcoin Node
                      </span>
                      <span className="font-mono text-xs truncate ml-4 max-w-[300px]">
                        {initialUnlockParams.bitcoind_rpc_host}:
                        {initialUnlockParams.bitcoind_rpc_port}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">
                        RPC Username
                      </span>
                      <span className="font-mono text-xs truncate ml-4 max-w-[300px]">
                        {initialUnlockParams.bitcoind_rpc_username}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">Indexer URL</span>
                      <span className="font-mono text-xs truncate ml-4 max-w-[300px]">
                        {initialUnlockParams.indexer_url}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">RGB Proxy</span>
                      <span className="font-mono text-xs truncate ml-4 max-w-[300px]">
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
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          {/* Back Button - Only show if onBack is provided */}
          {onBack && (
            <button
              className="px-4 py-2.5 rounded-lg border-2 border-slate-700/50 
                       text-slate-300 hover:bg-slate-700/30 transition-all duration-200
                       focus:ring-2 focus:ring-slate-700/20 focus:outline-none
                       flex items-center justify-center gap-2 text-sm"
              disabled={isUnlocking}
              onClick={onBack}
              type="button"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          {/* Unlock Button */}
          <button
            className="flex-1 px-6 py-2.5 rounded-lg bg-cyan text-blue-darkest 
                     font-semibold hover:bg-cyan/90 transition-colors duration-200
                     focus:ring-2 focus:ring-cyan/20 focus:outline-none
                     flex items-center justify-center gap-2 text-sm
                     disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUnlocking}
            type="submit"
          >
            {isUnlocking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-blue-dark p-6 rounded-xl max-w-md w-full text-center">
            <Loader2 className="w-10 h-10 text-cyan animate-spin mx-auto mb-4" />
            <h4 className="text-lg font-bold mb-2">Unlocking Your Node</h4>
            <p className="text-gray-400 text-sm">
              Please wait while we unlock your node. This may take a moment.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
