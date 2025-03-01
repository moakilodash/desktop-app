import { RefreshCw, Wallet, Info } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'

import { useAppSelector } from '../../app/store/hooks'
import { getAssetPrecision } from '../../helpers/number'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

interface TakerSwapFormProps {
  assets: any[]
  formatAmount: (amount: number, asset: string) => string
  getDisplayAsset: (asset: string) => string
  getAssetPrecision: (asset: string) => number
}

interface FormValues {
  swapString: string
}

export const TakerSwapForm: React.FC<TakerSwapFormProps> = ({
  formatAmount,
  getAssetPrecision: propsGetAssetPrecision,
}) => {
  const [swapDetails, setSwapDetails] = useState<any>(null)
  const [isWhitelisting, setIsWhitelisting] = useState(false)
  const [isDecoding, setIsDecoding] = useState(false)
  const [assetBalances, setAssetBalances] = useState<
    Record<string, { offChain: number; onChain: number }>
  >({})
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [whitelistSuccess, setWhitelistSuccess] = useState(false)
  const [decodeError, setDecodeError] = useState<string | null>(null)
  const { data: assetsData } = nodeApi.endpoints.listAssets.useQuery()

  const { register, watch, reset } = useForm<FormValues>({
    defaultValues: {
      swapString: '',
    },
  })

  const swapString = watch('swapString')
  const bitcoinUnit = useAppSelector((state) => state.settings.bitcoinUnit)

  const [assetBalance] = nodeApi.endpoints.assetBalance.useLazyQuery()
  const [executeTaker] = nodeApi.endpoints.taker.useLazyQuery()
  const { data: nodeInfoData } = nodeApi.endpoints.nodeInfo.useQuery()

  // Manual decode function for swap strings
  const decodeSwapString = (swapString: string) => {
    try {
      const swap_parts = swapString.split('/')
      if (swap_parts.length !== 6) {
        throw new Error('Invalid swap string format.')
      }

      const [
        swapFromAmount,
        swapFromAsset,
        swapToAmount,
        swapToAsset,
        timeout_sec,
        payment_hash,
      ] = swap_parts

      return {
        from_asset: swapFromAsset,
        payment_hash: payment_hash,
        qty_from: parseFloat(swapFromAmount),
        qty_to: parseFloat(swapToAmount),
        timeout_sec: parseInt(timeout_sec),
        to_asset: swapToAsset,
      }
    } catch (error) {
      console.error('Failed to decode swap string:', error)
      throw new Error('Invalid swap string format. Please check and try again.')
    }
  }

  // Fetch asset balances when swap details change
  const fetchAssetBalances = async () => {
    if (!swapDetails) return

    setIsLoadingBalances(true)
    setIsRefreshing(true)
    const newBalances: Record<string, { offChain: number; onChain: number }> = {
      ...assetBalances,
    }

    try {
      // Fetch from asset balance if needed
      if (swapDetails.from_asset) {
        const balance = await assetBalance({ asset_id: swapDetails.from_asset })
        newBalances[swapDetails.from_asset] = {
          offChain: balance.data?.offchain_outbound || 0,
          onChain: balance.data?.future || 0,
        }
      }

      // Fetch to asset balance if needed
      if (swapDetails.to_asset) {
        const balance = await assetBalance({ asset_id: swapDetails.to_asset })
        newBalances[swapDetails.to_asset] = {
          offChain: balance.data?.offchain_outbound || 0,
          onChain: balance.data?.future || 0,
        }
      }

      setAssetBalances(newBalances)
      toast.success('Asset balances updated')
    } catch (error) {
      console.error('Failed to fetch asset balances:', error)
      toast.error('Failed to fetch asset balances')
    } finally {
      setIsLoadingBalances(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (swapDetails) {
      fetchAssetBalances()
    }
  }, [swapDetails])

  // Auto-decode on paste/change of swap string
  useEffect(() => {
    if (swapString && !isDecoding && !whitelistSuccess) {
      onDecodeSwap()
    }
  }, [swapString])

  const onDecodeSwap = async () => {
    if (!swapString) {
      setSwapDetails(null)
      setDecodeError(null)
      return
    }

    setIsDecoding(true)
    setDecodeError(null)

    try {
      // Use the manual decode function instead of API call
      const decodedSwap = decodeSwapString(swapString)
      setSwapDetails(decodedSwap)
    } catch (error: any) {
      console.error('Failed to decode swap:', error)
      setDecodeError(error.message || 'Failed to decode swap string')
      setSwapDetails(null)
    } finally {
      setIsDecoding(false)
    }
  }

  const onWhitelistMaker = async () => {
    if (!swapString) {
      toast.error('Please enter a swap string')
      return
    }

    setIsWhitelisting(true)
    try {
      // Use the taker endpoint to whitelist the maker
      // Note: According to the API, we only need to pass the swapstring
      await executeTaker({
        swapstring: swapString,
      })

      toast.success('Trade whitelisted successfully')
      setWhitelistSuccess(true)
    } catch (error) {
      console.error('Failed to whitelist trade:', error)
      toast.error('Failed to whitelist trade. Please try again.')
    } finally {
      setIsWhitelisting(false)
    }
  }

  const resetForm = () => {
    reset()
    setSwapDetails(null)
    setWhitelistSuccess(false)
    setDecodeError(null)
  }

  // Format balance for display
  const formatBalanceDisplay = (asset: string, balance: number) => {
    if (!asset) return '0'
    const precision = getAssetPrecision(asset, bitcoinUnit, assetsData?.nia)
    const formattedBalance = balance / Math.pow(10, precision)
    return formattedBalance.toLocaleString(undefined, {
      maximumFractionDigits: precision,
      minimumFractionDigits: 0, // Don't show unnecessary zeros
    })
  }

  // Get asset ticker for display
  const getAssetTicker = (assetId: string) => {
    if (assetId === 'BTC') return bitcoinUnit === 'SAT' ? 'SAT' : 'BTC'
    const asset = assetsData?.nia.find((a) => a.asset_id === assetId)
    return asset ? asset.ticker || asset.name : assetId
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-4">
        <h2 className="text-xl font-semibold text-white">Receive Swap</h2>
        <p className="text-sm text-slate-400">
          Whitelist incoming atomic swaps as a taker
        </p>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-slate-700/50 swap-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white step-indicator">
              1
            </div>
            <h3 className="text-md font-medium text-white">
              Paste Swap String
            </h3>
          </div>
          <button
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            disabled={isRefreshing || !swapDetails}
            onClick={fetchAssetBalances}
            title="Refresh balances"
          >
            <RefreshCw
              className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
        <p className="text-sm text-slate-400 ml-8 mb-4">
          Paste the swap string from the maker to automatically decode and view
          the swap details.
        </p>

        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">
              Swap String
            </label>
            <textarea
              className={`w-full px-4 py-3 bg-slate-800 border ${decodeError ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white focus:outline-none focus:border-blue-500 input-animate h-24 font-mono text-xs`}
              placeholder="Paste the swap string here..."
              {...register('swapString', { required: true })}
              disabled={whitelistSuccess}
            />
            {decodeError && (
              <p className="mt-1 text-xs text-red-400">{decodeError}</p>
            )}
            {isDecoding && (
              <p className="mt-1 text-xs text-blue-400">
                Decoding swap string...
              </p>
            )}
          </div>
        </div>
      </div>

      {swapDetails && (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 swap-card swap-initiated">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white step-indicator">
              2
            </div>
            <h3 className="text-md font-medium text-white">
              Review Swap Details
            </h3>
          </div>
          <p className="text-sm text-slate-400 ml-8 mb-4">
            Review the swap details before whitelisting the trade.
          </p>

          <div className="bg-slate-900/50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-1">
                    You Receive
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold text-white">
                      {formatAmount(swapDetails.qty_to, swapDetails.to_asset)}
                    </div>
                    <div className="text-md text-slate-400">
                      {getAssetTicker(swapDetails.to_asset)}
                    </div>
                  </div>
                  {assetBalances[swapDetails.to_asset] && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 asset-balance">
                      <Wallet className="w-3 h-3" />
                      <span>Current Balance: </span>
                      <span className="font-medium text-slate-300">
                        {isLoadingBalances
                          ? 'Loading...'
                          : `${formatBalanceDisplay(swapDetails.to_asset, assetBalances[swapDetails.to_asset].offChain)} ${getAssetTicker(swapDetails.to_asset)}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-1">
                    You Send
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold text-white">
                      {formatAmount(
                        swapDetails.qty_from,
                        swapDetails.from_asset
                      )}
                    </div>
                    <div className="text-md text-slate-400">
                      {getAssetTicker(swapDetails.from_asset)}
                    </div>
                  </div>
                  {assetBalances[swapDetails.from_asset] && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1 asset-balance">
                      <Wallet className="w-3 h-3" />
                      <span>Current Balance: </span>
                      <span className="font-medium text-slate-300">
                        {isLoadingBalances
                          ? 'Loading...'
                          : `${formatBalanceDisplay(swapDetails.from_asset, assetBalances[swapDetails.from_asset].offChain)} ${getAssetTicker(swapDetails.from_asset)}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50 mb-4">
              <div className="flex items-center gap-2 text-xs text-blue-400">
                <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <p>
                  <strong>Important:</strong> For the swap to succeed, you need
                  sufficient liquidity in the lightning channels between you and
                  the maker for both assets involved. This includes Bitcoin
                  liquidity for routing payments.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700">
              <h4 className="text-sm font-medium text-slate-300 mb-2">
                Additional Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Timeout</span>
                  <span className="text-sm text-white">
                    {swapDetails.timeout_sec} seconds
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-400">Payment Hash</span>
                  <span className="text-sm text-white font-mono truncate">
                    {swapDetails.payment_hash}
                  </span>
                </div>
              </div>
            </div>

            {assetBalances[swapDetails.from_asset] &&
              assetBalances[swapDetails.from_asset].offChain /
                Math.pow(10, propsGetAssetPrecision(swapDetails.from_asset)) <
                swapDetails.qty_from && (
                <div className="mt-4 p-3 bg-red-900/30 rounded-lg border border-red-700/50">
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <Info className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p>
                      Warning: You don't have enough{' '}
                      {getAssetTicker(swapDetails.from_asset)} to complete this
                      swap. The swap will fail if you proceed without sufficient
                      funds.
                    </p>
                  </div>
                </div>
              )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 p-3 bg-slate-800/30 rounded-xl border border-slate-700 mb-4">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <p>
              After whitelisting, inform the maker that they can now execute the
              swap. The assets will be exchanged automatically once they
              execute. Ensure you have sufficient liquidity of both assets and
              Bitcoin in the lightning channels between you and the maker for
              the swap to succeed.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors button-animate"
              disabled={isWhitelisting}
              onClick={resetForm}
              type="button"
            >
              Reset
            </button>

            <button
              className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-emerald-600 button-animate"
              disabled={isWhitelisting || !swapString || whitelistSuccess}
              onClick={onWhitelistMaker}
              type="button"
            >
              {isWhitelisting ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Whitelisting...</span>
                </div>
              ) : whitelistSuccess ? (
                'Whitelisted Successfully'
              ) : (
                'Whitelist Trade'
              )}
            </button>
          </div>

          {whitelistSuccess && (
            <div className="mt-4 p-3 bg-emerald-900/30 rounded-lg border border-emerald-700/50">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <Info className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <p>
                  <strong>Trade has been whitelisted successfully.</strong>{' '}
                  Please inform the maker that you are ready to swap. The assets
                  will be exchanged automatically once they execute the swap.
                </p>
              </div>

              {nodeInfoData?.pubkey && (
                <div className="mt-3 p-2 bg-slate-800/50 rounded border border-slate-700/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-400">
                      Your Node Public Key (needed by maker):
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-emerald-300 font-mono bg-slate-900/50 p-1.5 rounded flex-1 overflow-x-auto">
                        {nodeInfoData.pubkey}
                      </code>
                      <button
                        className="p-1.5 rounded bg-slate-700 hover:bg-slate-600 transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(nodeInfoData.pubkey)
                          toast.success('Public key copied to clipboard')
                        }}
                        title="Copy to clipboard"
                      >
                        <svg
                          className="text-slate-300"
                          fill="none"
                          height="14"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          width="14"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            height="14"
                            rx="2"
                            ry="2"
                            width="14"
                            x="8"
                            y="8"
                          />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
