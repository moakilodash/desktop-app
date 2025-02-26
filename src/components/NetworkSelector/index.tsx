import { ChevronDown, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

import { BitcoinNetwork } from '../../constants'
import { NETWORK_DEFAULTS } from '../../constants/networks'

interface NetworkSelectorProps {
  selectedNetwork: BitcoinNetwork
  onChange: (network: BitcoinNetwork) => void
  className?: string
}

export const NetworkSelector = ({
  selectedNetwork,
  onChange,
  className = '',
}: NetworkSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Get badge color for network indicator
  const getNetworkBadgeColor = (network: string) => {
    switch (network) {
      case 'Testnet':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
      case 'Signet':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
      default:
        return 'bg-cyan/20 text-cyan border border-cyan/30'
    }
  }

  // Filter out Mainnet from available networks
  const availableNetworks = Object.keys(NETWORK_DEFAULTS).filter(
    (network) => network !== 'Mainnet'
  )

  return (
    <div className={`${className} relative`} ref={dropdownRef}>
      <label className="block text-sm font-medium mb-2 text-slate-300">
        Network
      </label>

      {/* Dropdown trigger button */}
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex items-center justify-between w-full px-4 py-3 
          border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan/50
          ${
            isOpen
              ? 'border-cyan bg-blue-dark/60 shadow-[0_0_10px_rgba(0,200,255,0.15)]'
              : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 hover:border-slate-600/70'
          }`}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium ${getNetworkBadgeColor(selectedNetwork)}`}
          >
            {selectedNetwork}
          </span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform duration-300 ease-in-out
          ${isOpen ? 'rotate-180 text-cyan' : 'group-hover:text-slate-300'}`}
        />
      </button>

      {/* Dropdown menu with animation */}
      {isOpen && (
        <div
          className="absolute z-10 w-full mt-2 bg-blue-darker border border-slate-700/50 rounded-lg shadow-lg overflow-hidden
          animate-in fade-in slide-in-from-top-2 duration-200"
          role="listbox"
        >
          <div className="py-1 max-h-60 overflow-auto">
            {availableNetworks.map((network) => (
              <button
                aria-selected={selectedNetwork === network}
                className={`flex items-center justify-between w-full px-4 py-3 text-left 
                  hover:bg-blue-dark/60 transition-colors duration-150
                  ${selectedNetwork === network ? 'bg-blue-dark/40' : ''}`}
                key={network}
                onClick={() => {
                  onChange(network as BitcoinNetwork)
                  setIsOpen(false)
                }}
                role="option"
                type="button"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium ${getNetworkBadgeColor(network)}`}
                  >
                    {network}
                  </span>
                </div>
                {selectedNetwork === network && (
                  <Check className="w-4 h-4 text-cyan" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
