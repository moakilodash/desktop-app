import { NavLink, Outlet } from 'react-router-dom'
import { twJoin } from 'tailwind-merge'

import {
  WALLET_HISTORY_DEPOSITS_PATH,
  WALLET_HISTORY_WITHDRAWALS_PATH,
  WALLET_HISTORY_TRADES_PATH,
} from '../../app/router/paths'

const TABS = [
  {
    label: 'Deposits',
    path: WALLET_HISTORY_DEPOSITS_PATH,
  },
  {
    label: 'Withdrawals',
    path: WALLET_HISTORY_WITHDRAWALS_PATH,
  },
  {
    label: 'Swaps',
    path: WALLET_HISTORY_TRADES_PATH,
  },
]
export const Component = () => {
  return (
    <div className="w-full bg-blue-dark py-8 px-6 rounded self-start">
      <div className="text-2xl mb-8">Wallet History</div>

      <div className="flex justify-between items-center">
        <ul className="flex space-x-4">
          {TABS.map((tab) => (
            <li key={tab.path}>
              <NavLink
                className={({ isActive }) =>
                  twJoin(
                    'block py-3 px-6 rounded-t text-lg font-semibold',
                    isActive ? 'bg-section-lighter' : 'bg-background'
                  )
                }
                to={tab.path}
              >
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-section-lighter rounded-b py-8 px-6">
        <Outlet />
      </div>
    </div>
  )
}
