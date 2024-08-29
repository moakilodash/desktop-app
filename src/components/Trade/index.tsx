import PropTypes from 'prop-types'
import React, { useCallback, useState, useEffect, useRef } from 'react'
import { twJoin } from 'tailwind-merge'

import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import { ArrowDownIcon } from '../../icons/ArrowDown'

const SATOSHIS_PER_BTC = 100000000

type BitcoinUnit = 'BTC' | 'SAT'

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
          props.theme === 'dark' ? 'bg-blue-dark' : 'bg-section-lighter'
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
}

const AssetSelect: React.FC<AssetSelectProps> = ({
  options,
  value,
  onChange,
}) => (
  <Select active={value} onSelect={onChange} options={options} theme="dark" />
)

interface ExchangeRateDisplayProps {
  fromAsset: string
  toAsset: string
  price: number | null
  isInverted: boolean
  bitcoinUnit: BitcoinUnit
  formatAmount: (amount: number, asset: string) => string
}

const ExchangeRateDisplay: React.FC<ExchangeRateDisplayProps> = ({
  fromAsset,
  toAsset,
  price,
  isInverted,
  bitcoinUnit,
  formatAmount,
}) => {
  const calculateAndFormatRate = useCallback(
    (
      fromAsset: string,
      toAsset: string,
      price: number | null,
      isInverted: boolean
    ): string => {
      if (!price) return ''

      let rate = isInverted ? 1 / price : price

      // Determine the display units
      const fromUnit = fromAsset === 'BTC' ? bitcoinUnit : fromAsset
      const toUnit = toAsset === 'BTC' ? bitcoinUnit : toAsset

      // Adjust rate based on Bitcoin unit
      if (fromAsset === 'BTC' && bitcoinUnit === 'SAT') {
        rate = rate * SATOSHIS_PER_BTC
      } else if (toAsset === 'BTC' && bitcoinUnit === 'SAT') {
        rate = rate / SATOSHIS_PER_BTC
      }

      // Format the rate
      let formattedRate: string
      if (fromUnit === 'SAT') {
        formattedRate = formatAmount(rate, toAsset)
      } else if (toUnit === 'SAT') {
        formattedRate = formatAmount(1 / rate, fromAsset)
      } else {
        formattedRate = formatAmount(rate, toAsset)
      }

      return `1 ${fromUnit} = ${formattedRate} ${toUnit}`
    },
    [bitcoinUnit, formatAmount]
  )

  const displayRate = calculateAndFormatRate(
    fromAsset,
    toAsset,
    price,
    isInverted
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
