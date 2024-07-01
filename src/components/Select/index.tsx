import { useRef, useState } from 'react'
import { twJoin } from 'tailwind-merge'

import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import { ArrowDownIcon } from '../../icons/ArrowDown'

interface Props {
  active?: string
  options: { value: string; label: string }[]
  onSelect: (value: string) => void
  theme: 'light' | 'dark'
}

export const Select = (props: Props) => {
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
        <span>{active?.label ?? 'None'}</span>

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
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

Select.defaultProps = {
  theme: 'dark',
}
