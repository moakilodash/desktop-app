import PropTypes from 'prop-types'
import React, { useCallback, useState, useEffect, useRef } from 'react'
import { twJoin } from 'tailwind-merge'

import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import { ArrowDownIcon } from '../../icons/ArrowDown'
import { TradingPair } from '../../slices/makerApi/makerApi.slice'

const SATOSHIS_PER_BTC = 100000000

interface AssetOptionProps {
  value: string
  label: string
}

const AssetOption: React.FC<AssetOptionProps> = React.memo(
  ({ value, label }) => {
    const [imgSrc, setImgSrc] = useState<string>('')

    useEffect(() => {
      const loadIcon = async () => {
        try {
          const iconUrl = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/${value.toLowerCase()}.svg`
          const response = await fetch(iconUrl)
          if (response.ok) {
            setImgSrc(iconUrl)
          } else {
            throw new Error('Icon not found')
          }
        } catch (error) {
          console.warn(`Failed to load icon for ${value}, using default.`)
          setImgSrc('/path/to/default-icon.svg') // Make sure to provide a default icon
        }
      }

      loadIcon()
    }, [value])

    return (
      <div className="flex items-center">
        <img
          alt={label}
          className="w-5 h-5 mr-2"
          onError={() => setImgSrc('/path/to/default-icon.svg')}
          src={imgSrc}
        />
        {label}
      </div>
    )
  }
)

AssetOption.displayName = 'AssetOption'

AssetOption.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
}

interface SelectProps {
  active?: string
  options: Array<{ value: string; label: string }>
  onSelect: (value: string) => void
  theme: 'light' | 'dark'
  disabled?: boolean // Add the disabled prop
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
        onClick={() => setIsOpen((state) => !state)}
      >
        <AssetOption
          label={active?.label || 'None'}
          value={active?.value || ''}
        />
        <ArrowDownIcon />
      </div>

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
  disabled?: boolean // Add the disabled prop
}

const AssetSelect: React.FC<AssetSelectProps> = ({
  options,
  value,
  onChange,
  disabled = false, // Add a default value
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

const ExchangeRateDisplay: React.FC<ExchangeRateDisplayProps> = ({
  fromAsset,
  toAsset,
  price,
  selectedPair,
  bitcoinUnit,
  formatAmount,
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

      // Determine if the current trading direction is inverted compared to the selected pair
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

      return `1 ${fromUnit} = ${formattedRate} ${toUnit}`
    },
    [bitcoinUnit, formatAmount]
  )

  const displayRate = calculateAndFormatRate(
    fromAsset,
    toAsset,
    price,
    selectedPair
  )

  return (
    <input
      className="flex-1 rounded bg-blue-dark px-4 py-3"
      readOnly={true}
      type="text"
      value={displayRate}
    />
  )
}

export { AssetOption, AssetSelect, ExchangeRateDisplay }
