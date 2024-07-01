import { useRef, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import { ArrowDownIcon } from '../../icons/ArrowDown'

interface Props {
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onAssetChange: (value: string) => void
  asset: string
  from: string
  to: string
}

export const HistoryFilters = (props: Props) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  useOnClickOutside(menuRef, () => setIsOpen(false))

  return (
    <div className="relative pr-4" ref={menuRef}>
      <div
        className="text-lg text-grey-light flex items-center space-x-2 cursor-pointer"
        onClick={() => setIsOpen((state) => !state)}
      >
        <span>Filters</span>

        <ArrowDownIcon />
      </div>

      <div
        className={twJoin(
          'absolute top-full bg-background rounded w-72 right-0 p-4',
          !isOpen ? 'hidden' : undefined
        )}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm mb-3">From</div>

            <input
              className="bg-blue-dark rounded px-4 py-2 font-medium"
              type="date"
              value={props.from}
            />
          </div>

          <div>
            <div className="text-sm mb-3">To</div>

            <input
              className="bg-blue-dark rounded px-4 py-2 font-medium"
              type="date"
              value={props.to}
            />
          </div>

          <div>
            <div className="text-sm mb-3">Select Asset</div>

            <select
              className="bg-blue-dark rounded w-full appearance-none px-4 py-2"
              value={props.asset}
            >
              <option value="rBTC">BTC</option>
              <option value="rUSDT">USDT</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
