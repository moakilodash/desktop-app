import React, { useCallback, useState, useRef } from 'react'
import { twJoin } from 'tailwind-merge'

import { DEFAULT_RGB_ICON } from '../../constants'
import { useAssetIcon } from '../../helpers/utils'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import { ArrowDownIcon } from '../../icons/ArrowDown'
import { TradingPair } from '../../slices/makerApi/makerApi.slice'
const SATOSHIS_PER_BTC = 100000000

interface AssetOptionProps {
  value: string
  label: string
}

export const AssetOption = React.memo(({ value, label }: AssetOptionProps) => {
  const [imgSrc, setImgSrc] = useAssetIcon(value)

  return (
    <div className="flex items-center">
      <img
        alt={label}
        className="w-5 h-5 mr-2"
        onError={() => setImgSrc(DEFAULT_RGB_ICON)}
        src={imgSrc}
      />
      {label}
    </div>
  )
})
AssetOption.displayName = 'AssetOption'

interface SelectProps {
  active?: string
  options: Array<{ value: string; label: string }>
  onSelect: (value: string) => void
  theme: 'light' | 'dark'
  disabled?: boolean
}

const Select: React.FC<SelectProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useOnClickOutside(menuRef, () => setIsOpen(false))

  const active = props.options.find((option) => option.value === props.active)

  return (
    <div className="relative" ref={menuRef}>
      <div
        className={twJoin(
          'flex items-center justify-between px-4 py-3 rounded cursor-pointer w-32',
          props.theme === 'dark' ? 'bg-blue-dark' : 'bg-section-lighter',
          props.disabled ? 'opacity-50 cursor-not-allowed' : ''
        )}
        onClick={() => !props.disabled && setIsOpen((state) => !state)}
      >
        <AssetOption
          label={active?.label || 'None'}
          value={active?.value || ''}
        />
        <ArrowDownIcon />
      </div>

      {!props.disabled && (
        <ul
          className={twJoin(
            'absolute top-full bg-section-lighter divide-y divide-divider rounded',
            !isOpen ? 'hidden' : undefined
          )}
        >
          {props.options.map((option) => (
            <li
              className="px-4 py-3 cursor-pointer hover:bg-divider first:rounded-t last:rounded-b"
              key={option.value}
              onClick={() => {
                props.onSelect(option.value)
                setIsOpen(false)
              }}
            >
              <AssetOption label={option.label} value={option.value} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

Select.defaultProps = {
  theme: 'dark',
}

interface AssetSelectProps {
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export const AssetSelect: React.FC<AssetSelectProps> = ({
  options,
  value,
  onChange,
  disabled = false,
}) => (
  <Select
    active={value}
    disabled={disabled}
    onSelect={onChange}
    options={options}
    theme="dark"
  />
)

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
            <AssetOption label={fromUnit} value={fromAsset} />
          </div>
          <span className="text-slate-400">=</span>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-medium">{formattedRate}</span>
            <AssetOption label={toUnit} value={toAsset} />
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
