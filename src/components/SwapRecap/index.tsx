import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import React, { useCallback } from 'react'

import { AssetOption } from '../../components/Trade'
import { TradingPair } from '../../slices/makerApi/makerApi.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

const SATOSHIS_PER_BTC = 100000000

export interface SwapDetails {
  price: number
  fromAmount: string
  fromAsset: string
  toAmount: string
  toAsset: string
  timestamp: string
  selectedPair: TradingPair | null
  payment_hash: string
}

interface SwapRecapProps {
  isOpen: boolean
  onClose: () => void
  swapDetails: SwapDetails
  bitcoinUnit: string
  formatAmount: (amount: number, asset: string) => string
  getAssetPrecision: (asset: string) => number
}

const getDisplayAsset = (asset: string, bitcoinUnit: string) => {
  return asset === 'BTC' && bitcoinUnit === 'SAT' ? 'SAT' : asset
}

const getStatusConfig = (status: string | undefined) => {
  switch (status?.toLowerCase()) {
    case 'succeeded':
      return {
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-500',
        icon: CheckCircle,
        message: 'Swap completed successfully',
      }
    case 'expired':
      return {
        bg: 'bg-red-500/10',
        color: 'text-red-500',
        icon: AlertCircle,
        message: 'Swap expired - The maker did not respond in time',
      }
    case 'pending':
      return {
        bg: 'bg-blue-500/10',
        color: 'text-blue-500',
        icon: Clock,
        message: 'Swap in progress',
      }
    default:
      return {
        bg: 'bg-slate-500/10',
        color: 'text-slate-500',
        icon: AlertCircle,
        message: 'Unknown status',
      }
  }
}

export const SwapRecap: React.FC<SwapRecapProps> = ({
  isOpen,
  onClose,
  swapDetails,
  bitcoinUnit,
  formatAmount,
  getAssetPrecision,
}) => {
  const {
    price,
    fromAmount,
    fromAsset,
    toAmount,
    toAsset,
    timestamp,
    selectedPair,
    payment_hash,
  } = swapDetails

  const { data: swapsData, isLoading: isSwapsLoading } =
    nodeApi.useListSwapsQuery(undefined, {
      pollingInterval: 3000,
    })

  const currentSwap = swapsData?.taker.find(
    (swap) => swap.payment_hash === payment_hash
  )

  const calculateAndFormatRate = useCallback(
    (
      fromAsset: string,
      toAsset: string,
      price: number,
      selectedPair: TradingPair | null
    ) => {
      if (!price) return ''

      let rate = price
      if (!selectedPair) return rate

      const isInverted =
        fromAsset === selectedPair.quote_asset &&
        toAsset === selectedPair.base_asset

      const precision = !isInverted
        ? getAssetPrecision(displayToAsset)
        : getAssetPrecision(displayFromAsset)

      let fromUnit = fromAsset === 'BTC' ? bitcoinUnit : fromAsset
      let toUnit = toAsset === 'BTC' ? bitcoinUnit : toAsset

      if (
        (fromUnit === 'SAT' && !isInverted) ||
        (toUnit === 'SAT' && isInverted)
      ) {
        rate = rate / SATOSHIS_PER_BTC
      }

      const formattedRate = !isInverted
        ? new Intl.NumberFormat('en-US', {
            maximumFractionDigits: precision > 4 ? precision : 4,
            minimumFractionDigits: precision,
            useGrouping: true,
          }).format(
            parseFloat(
              (rate / Math.pow(10, precision)).toFixed(
                precision > 4 ? precision : 4
              )
            )
          )
        : new Intl.NumberFormat('en-US', {
            maximumFractionDigits: precision > 4 ? precision : 4,
            minimumFractionDigits: precision,
            useGrouping: true,
          }).format(
            parseFloat(
              (Math.pow(10, precision) / rate).toFixed(
                precision > 4 ? precision : 4
              )
            )
          )

      return `1 ${fromUnit} = ${formattedRate} ${toUnit}`
    },
    [bitcoinUnit, formatAmount]
  )

  if (!isOpen) return null

  const displayFromAsset = getDisplayAsset(fromAsset, bitcoinUnit)
  const displayToAsset = getDisplayAsset(toAsset, bitcoinUnit)
  const exchangeRate = calculateAndFormatRate(
    fromAsset,
    toAsset,
    price,
    selectedPair
  )

  const isPending = currentSwap?.status === 'Pending'
  const isSucceeded = currentSwap?.status === 'Succeeded'
  const isExpired = currentSwap?.status === 'Expired'

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/90 rounded-xl border border-slate-800/50 w-full max-w-md">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Swap Details</h2>
            <button
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status Card */}
          <div
            className={`${getStatusConfig(currentSwap?.status).bg} rounded-lg p-4 space-y-4`}
          >
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {isSwapsLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <span
                      className={getStatusConfig(currentSwap?.status).color}
                    >
                      {React.createElement(
                        getStatusConfig(currentSwap?.status).icon,
                        { size: 20 }
                      )}
                    </span>
                  )}
                  <span className="font-medium text-slate-200">Status</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium 
                    ${getStatusConfig(currentSwap?.status).color} 
                    ${getStatusConfig(currentSwap?.status).bg}`}
                >
                  {currentSwap?.status || 'Unknown'}
                </span>
              </div>

              {/* Status Message */}
              <div
                className={`text-sm ${getStatusConfig(currentSwap?.status).color}`}
              >
                {getStatusConfig(currentSwap?.status).message}
              </div>
            </div>

            {isPending && (
              <div className="w-full h-1 bg-blue-500/20 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full animate-progress" />
              </div>
            )}

            {/* Show warning message for expired swaps */}
            {isExpired && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-red-500 font-medium">Swap Failed</p>
                    <p className="text-red-400/80">
                      The swap request expired because the maker did not respond
                      in time. This could be due to network issues or the maker
                      being temporarily unavailable. Please try again.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Swap Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4">
                <div className="space-y-1">
                  <span className="text-sm text-slate-400">You sent</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium text-white">
                      {fromAmount}
                    </span>
                    <AssetOption label={displayFromAsset} value={fromAsset} />
                  </div>
                </div>
                <ArrowRight className="text-slate-600 mx-2" />
                <div className="space-y-1 text-right">
                  <span className="text-sm text-slate-400">You received</span>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-lg font-medium text-white">
                      {toAmount}
                    </span>
                    <AssetOption label={displayToAsset} value={toAsset} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 bg-slate-800/50 rounded-lg p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Exchange rate</span>
                  <span className="text-white font-medium">{exchangeRate}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Time</span>
                  <span className="text-white">
                    {new Date(timestamp).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors 
              flex items-center justify-center gap-2
              ${
                isExpired
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            onClick={onClose}
          >
            {isSucceeded ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Done
              </>
            ) : isExpired ? (
              <>
                <RefreshCw className="w-5 h-5" />
                Try Again
              </>
            ) : (
              'OK'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
