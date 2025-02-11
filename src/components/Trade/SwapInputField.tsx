import { RefreshCw } from 'lucide-react'
import React from 'react'

import { SizeButtons } from './SizeButtons'

import { AssetSelect } from './index'

interface SwapInputFieldProps {
  label: string
  availableAmount?: string
  maxAmount?: number
  minAmount?: number
  maxHtlcAmount?: number
  isLoading?: boolean
  isLoadingLabel?: string
  disabled: boolean
  value: string
  asset: string
  assetOptions: { label: string; value: string }[]
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onAssetChange: (value: string) => void
  onRefresh?: () => void
  formatAmount: (amount: number, asset: string) => string
  getDisplayAsset: (asset: string) => string
  showMinAmount?: boolean
  showMaxHtlc?: boolean
  showSizeButtons?: boolean
  selectedSize?: number
  onSizeClick?: (size: number) => void
}

export const SwapInputField: React.FC<SwapInputFieldProps> = ({
  label,
  availableAmount,
  minAmount,
  maxHtlcAmount,
  isLoading,
  isLoadingLabel = 'Estimating...',
  disabled,
  value,
  asset,
  assetOptions,
  onAmountChange,
  onAssetChange,
  onRefresh,
  formatAmount,
  getDisplayAsset,
  showMinAmount = false,
  showMaxHtlc = false,
  showSizeButtons,
  selectedSize,
  onSizeClick,
}) => (
  <div className="space-y-3 bg-slate-800/50 rounded-lg p-4">
    <div className="flex justify-between items-center">
      <div className="text-sm font-medium text-slate-400">{label}</div>
      {availableAmount && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Available: {availableAmount}</span>
          {onRefresh && (
            <button
              className="p-1 rounded hover:bg-slate-700/50 transition-colors"
              disabled={disabled}
              onClick={onRefresh}
              title="Refresh amounts"
              type="button"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
              />
            </button>
          )}
        </div>
      )}
    </div>

    <div className="flex gap-3">
      {isLoading ? (
        <div
          className="flex-1 px-4 py-2.5 bg-slate-900/50 rounded-lg border border-slate-700 
                     text-slate-400 min-h-[42px] flex items-center"
        >
          {isLoadingLabel}
        </div>
      ) : (
        <input
          className="flex-1 px-4 py-2.5 bg-slate-900/50 rounded-lg border border-slate-700 
                   text-white text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                   placeholder:text-slate-600 min-h-[42px]"
          disabled={disabled}
          onChange={onAmountChange}
          type="text"
          value={value}
        />
      )}
      <AssetSelect
        disabled={disabled}
        onChange={onAssetChange}
        options={assetOptions}
        value={asset}
      />
    </div>

    {(showMinAmount || showMaxHtlc) && (
      <div className="flex items-center gap-4 text-xs">
        {showMinAmount && minAmount && (
          <div className="text-slate-500">
            Min: {formatAmount(minAmount, asset)} {getDisplayAsset(asset)}
          </div>
        )}
        {showMaxHtlc && maxHtlcAmount && asset === 'BTC' && (
          <div className="relative group">
            <span className="text-slate-500 cursor-help border-b border-dotted border-slate-600">
              Max HTLC: {formatAmount(maxHtlcAmount, 'BTC')}{' '}
              {getDisplayAsset('BTC')}
            </span>
            <div
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 
                        bg-slate-800 text-xs text-slate-200 rounded-lg w-64 hidden group-hover:block
                        shadow-lg border border-slate-700 z-10"
            >
              <div className="relative">
                <div className="text-left space-y-1">
                  <p>
                    Maximum amount that can be sent in a single payment (HTLC).
                  </p>
                  <p className="text-slate-400">
                    This value considers both your available balance and channel
                    capacity limits.
                  </p>
                </div>
                <div
                  className="absolute w-2 h-2 bg-slate-800 rotate-45 
                            left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2
                            border-r border-b border-slate-700"
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}

    {showSizeButtons && selectedSize !== undefined && onSizeClick && (
      <SizeButtons
        disabled={disabled}
        onSizeClick={onSizeClick}
        selectedSize={selectedSize}
      />
    )}
  </div>
)
