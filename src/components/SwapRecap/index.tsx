import { X, Loader2, RefreshCw } from 'lucide-react'
import React, { useCallback } from 'react'

import { AssetOption } from '../../components/Trade'
import { makerApi, TradingPair } from '../../slices/makerApi/makerApi.slice'

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

  const statusResponse = makerApi.useStatusQuery(
    { payment_hash },
    { pollingInterval: 3000 }
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

  const isPending = statusResponse.data?.swap.status === 'Pending'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-blue-dark text-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Swap Recap</h2>
          <button className="text-gray-400 hover:text-white" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">You sent:</span>
            <div className="flex items-center font-bold">
              <span className="mr-2">{fromAmount}</span>
              <AssetOption label={displayFromAsset} value={fromAsset} />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">You received:</span>
            <div className="flex items-center font-bold">
              <span className="mr-2">{toAmount}</span>
              <AssetOption label={displayToAsset} value={toAsset} />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Exchange rate:</span>
            <span>{exchangeRate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Timestamp:</span>
            <span>{new Date(timestamp).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Status:</span>
            {statusResponse.isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : isPending ? (
              <div className="flex items-center">
                <span className="mr-2">Pending</span>
                <RefreshCw className="animate-spin" size={20} />
              </div>
            ) : (
              <span>{statusResponse.data?.swap.status}</span>
            )}
          </div>
        </div>
        <button
          className="w-full bg-cyan text-blue-dark py-2 rounded-lg font-bold hover:bg-cyan-dark transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}
