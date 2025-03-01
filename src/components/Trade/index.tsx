import React, { useState, useRef } from 'react'
import { twJoin } from 'tailwind-merge'

import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import { ArrowDownIcon } from '../../icons/ArrowDown'

import { AssetOption } from './AssetComponents'
import { ExchangeRateDisplay } from './ExchangeRateSection'

interface SelectProps {
  active?: string
  options: Array<{ value: string; label: string; ticker?: string }>
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
        <AssetOption ticker={active?.ticker} />
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
            <AssetOption ticker={option.ticker} />
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
  options: Array<{ value: string; label: string; ticker?: string }>
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

export { NoChannelsMessage } from './NoChannelsMessage'
export { NoTradingPairsMessage } from './NoTradingPairsMessage'
export { Header } from './Header'
export { SizeButtons } from './SizeButtons'
export { SwapInputField } from './SwapInputField'
export { ExchangeRateSection } from './ExchangeRateSection'
export { SwapButton } from './SwapButton'
export { MakerSelector } from './MakerSelector'
export { AssetOption, AssetSelect, ExchangeRateDisplay }
export { ManualSwapForm } from './ManualSwapForm'
export { NostrP2P } from './NostrP2P'
