import React, { useCallback } from 'react'

import { SATOSHIS_PER_BTC } from '../../helpers/number'
import { SparkIcon } from '../../icons/Spark'
import { TradingPair } from '../../slices/makerApi/makerApi.slice'

import { AssetOption } from './AssetComponents'

interface ExchangeRateDisplayProps {
  fromAsset: string
  toAsset: string
  price: number | null
  selectedPair: TradingPair | null
  bitcoinUnit: string
  formatAmount: (amount: number, asset: string) => string
  getAssetPrecision: (asset: string) => number
}

export const ExchangeRateDisplay: React.FC<ExchangeRateDisplayProps> = ({
  fromAsset,
  toAsset,
  price,
  selectedPair,
  bitcoinUnit,
  getAssetPrecision,
}) => {
  const calculateAndFormatRate = useCallback(
    (
      fromAsset: string,
      toAsset: string,
      price: number | null,
      selectedPair: { base_asset: string; quote_asset: string } | null
    ) => {
      if (!price || !selectedPair) return 'Price not available'

      let rate = price
      let displayFromAsset = fromAsset
      let displayToAsset = toAsset

      const isInverted =
        fromAsset === selectedPair.quote_asset &&
        toAsset === selectedPair.base_asset

      const precision = !isInverted
        ? getAssetPrecision(displayToAsset)
        : getAssetPrecision(displayFromAsset)

      let fromUnit = displayFromAsset === 'BTC' ? bitcoinUnit : displayFromAsset
      let toUnit = displayToAsset === 'BTC' ? bitcoinUnit : displayToAsset

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

      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-medium">1</span>
            <AssetOption ticker={fromUnit} />
          </div>
          <span className="text-slate-400">=</span>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-medium">{formattedRate}</span>
            <AssetOption ticker={toUnit} />
          </div>
        </div>
      )
    },
    [bitcoinUnit, getAssetPrecision]
  )

  const displayRate = calculateAndFormatRate(
    fromAsset,
    toAsset,
    price,
    selectedPair
  )

  return <div className="flex-1 text-base">{displayRate}</div>
}

interface ExchangeRateSectionProps {
  selectedPair: TradingPair | null
  selectedPairFeed: any
  isPriceLoading: boolean
  fromAsset: string
  toAsset: string
  bitcoinUnit: string
  formatAmount: (amount: number, asset: string) => string
  getAssetPrecision: (asset: string) => number
}

export const ExchangeRateSection: React.FC<ExchangeRateSectionProps> = ({
  selectedPair,
  selectedPairFeed,
  isPriceLoading,
  fromAsset,
  toAsset,
  bitcoinUnit,
  formatAmount,
  getAssetPrecision,
}) => {
  if (!selectedPair) return null

  return (
    <div className="exchange-rate-section">
      <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1 mb-1">
        <div className="w-1 h-1 rounded-full bg-emerald-500" />
        Best Exchange Rate Available
      </div>
      <div className="bg-slate-800/50 rounded-lg p-2 space-y-1.5">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Exchange Rate</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
            Live Price
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {isPriceLoading ? (
            <div
              className="flex-1 px-3 py-1.5 bg-slate-900/50 rounded-lg border border-slate-700 
                         text-slate-400 min-h-[32px] flex items-center text-sm"
            >
              Loading exchange rate...
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-between">
              <ExchangeRateDisplay
                bitcoinUnit={bitcoinUnit}
                formatAmount={formatAmount}
                fromAsset={fromAsset}
                getAssetPrecision={getAssetPrecision}
                price={selectedPairFeed ? selectedPairFeed.price : null}
                selectedPair={selectedPair}
                toAsset={toAsset}
              />
              <div className="flex items-center gap-2">
                <SparkIcon color="#fff" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
