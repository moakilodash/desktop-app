import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
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
        bg: 'bg-green-500/10',
        color: 'text-green-500',
        icon: CheckCircle,
      }
    case 'expired':
      return {
        bg: 'bg-red-500/10',
        color: 'text-red-500',
        icon: AlertCircle,
      }
    case 'pending':
      return {
        bg: 'bg-blue-500/10',
        color: 'text-blue-500',
        icon: Clock,
      }
    default:
      return {
        bg: 'bg-gray-500/10',
        color: 'text-gray-500',
        icon: Clock,
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-blue-dark rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">Swap Recap</h2>
          </div>
          <button
            className="text-gray-400 hover:text-white transition-colors"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        <div
          className={`${getStatusConfig(currentSwap?.status).bg} rounded-lg p-4 mb-6`}
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              {isSwapsLoading ? (
                <Loader2 className="animate-spin text-blue-500" size={20} />
              ) : (
                <span className={getStatusConfig(currentSwap?.status).color}>
                  {React.createElement(
                    getStatusConfig(currentSwap?.status).icon,
                    { size: 20 }
                  )}
                </span>
              )}
              <span className="font-medium">Status</span>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(currentSwap?.status).color}`}
            >
              {currentSwap?.status || 'Unknown'}
            </span>
          </div>

          {isPending && (
            <div className="w-full h-1.5 bg-blue-500/20 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-blue-500 rounded-full animate-progress" />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-gray-400">You sent</span>
                <div className="flex items-center gap-2 font-bold">
                  <span>{fromAmount}</span>
                  <AssetOption label={displayFromAsset} value={fromAsset} />
                </div>
              </div>
              <ArrowRight className="text-gray-400" size={20} />
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-400">You received</span>
                <div className="flex items-center gap-2 font-bold">
                  <span>{toAmount}</span>
                  <AssetOption label={displayToAsset} value={toAsset} />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Exchange rate</span>
                <span className="font-medium">{exchangeRate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Time</span>
                <span className="font-medium">
                  {new Date(timestamp).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          className="w-full bg-cyan text-blue-dark py-3 rounded-lg font-bold hover:bg-cyan-dark transition-colors"
          onClick={onClose}
        >
          {isSucceeded ? 'Done' : isExpired ? 'Close' : 'OK'}
        </button>
      </div>
    </div>
  )
}
