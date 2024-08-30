import { X } from 'lucide-react'
import React, { useCallback } from 'react'

import { AssetOption } from '../../components/Trade'
import { TradingPair } from '../../slices/makerApi/makerApi.slice'

const SATOSHIS_PER_BTC = 100000000

export interface SwapDetails {
  price: number
  fromAmount: string
  fromAsset: string
  toAmount: string
  toAsset: string
  timestamp: string
  selectedPair: TradingPair | null
}

interface SwapRecapProps {
  isOpen: boolean
  onClose: () => void
  swapDetails: SwapDetails
  bitcoinUnit: string
  formatAmount: (amount: number, asset: string) => string
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
}) => {
  const {
    price,
    fromAmount,
    fromAsset,
    toAmount,
    toAsset,
    timestamp,
    selectedPair,
  } = swapDetails

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

      if (isInverted) {
        rate = 1 / rate
      }

      let fromUnit = fromAsset === 'BTC' ? bitcoinUnit : fromAsset
      let toUnit = toAsset === 'BTC' ? bitcoinUnit : toAsset

      // Handle SAT conversion
      if (fromUnit === 'SAT' && toUnit !== 'SAT') {
        rate = rate / SATOSHIS_PER_BTC
      } else if (fromUnit !== 'SAT' && toUnit === 'SAT') {
        rate = rate * SATOSHIS_PER_BTC
      }

      const formattedRate = formatAmount(rate, toAsset)
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
              <span className="mr-2">
                {formatAmount(parseFloat(fromAmount), fromAsset)}
              </span>
              <AssetOption label={displayFromAsset} value={fromAsset} />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">You received:</span>
            <div className="flex items-center font-bold">
              <span className="mr-2">
                {formatAmount(parseFloat(toAmount), toAsset)}
              </span>
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
