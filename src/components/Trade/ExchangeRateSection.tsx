import React from 'react'

import { SparkIcon } from '../../icons/Spark'
import { TradingPair } from '../../slices/makerApi/makerApi.slice'

import { ExchangeRateDisplay } from './index'

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
    <>
      <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Best Exchange Rate Available
      </div>
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>Exchange Rate</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500/50 animate-pulse" />
            Live Price
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          {isPriceLoading ? (
            <div
              className="flex-1 px-4 py-2.5 bg-slate-900/50 rounded-lg border border-slate-700 
                         text-slate-400 min-h-[42px] flex items-center"
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
    </>
  )
}
