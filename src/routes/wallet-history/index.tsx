import {
  History,
  ArrowDownUp,
  Download,
  Upload,
  LayoutGrid,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { twJoin } from 'tailwind-merge'

import {
  WALLET_HISTORY_DEPOSITS_PATH,
  WALLET_HISTORY_WITHDRAWALS_PATH,
  WALLET_HISTORY_TRADES_PATH,
} from '../../app/router/paths'
import { Card } from '../../components/ui'

const TABS = [
  {
    color: 'green',
    icon: <Download className="w-4 h-4" />,
    label: 'Deposits',
    path: WALLET_HISTORY_DEPOSITS_PATH,
  },
  {
    color: 'red',
    icon: <Upload className="w-4 h-4" />,
    label: 'Withdrawals',
    path: WALLET_HISTORY_WITHDRAWALS_PATH,
  },
  {
    color: 'blue',
    icon: <ArrowDownUp className="w-4 h-4" />,
    label: 'Swaps',
    path: WALLET_HISTORY_TRADES_PATH,
  },
]

export const Component = () => {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(TABS[0])
  const [isMobile, setIsMobile] = useState(false)

  // Set the active tab and update indicator position
  useEffect(() => {
    const currentTab =
      TABS.find((tab) => location.pathname.startsWith(tab.path)) || TABS[0]
    setActiveTab(currentTab)

    // Check if the screen is mobile-sized
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [location.pathname])

  // Get the tab indicator color based on the active tab
  const getIndicatorColor = () => {
    switch (activeTab.color) {
      case 'green':
        return 'from-green-500 to-emerald-500'
      case 'red':
        return 'from-red-500 to-rose-500'
      case 'blue':
        return 'from-blue-500 to-indigo-500'
      default:
        return 'from-blue-500 to-indigo-500'
    }
  }

  // Get the icon background color based on the tab
  const getIconBgColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-500/10 text-green-500'
      case 'red':
        return 'bg-red-500/10 text-red-500'
      case 'blue':
        return 'bg-blue-500/10 text-blue-500'
      default:
        return 'bg-blue-500/10 text-blue-500'
    }
  }

  return (
    <Card
      className="w-full shadow-xl bg-gradient-to-b from-gray-800/50 to-gray-900 border border-gray-700/50 rounded-xl overflow-hidden"
      noPadding
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl ${getIconBgColor(activeTab.color)} transition-colors duration-300`}
          >
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Wallet History
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              View your {activeTab.label.toLowerCase()} history
            </p>
          </div>
        </div>

        {/* Filter button for mobile view */}
        {isMobile && (
          <div className="inline-flex rounded-lg overflow-hidden border border-gray-700 bg-gray-800/70">
            <select
              className="bg-transparent text-gray-300 px-3 py-2 outline-none appearance-none text-sm"
              onChange={(e) => {
                const path = e.target.value
                const tab = TABS.find((tab) => tab.path === path)
                if (tab) {
                  window.location.href = path
                }
              }}
              value={activeTab.path}
            >
              {TABS.map((tab) => (
                <option key={tab.path} value={tab.path}>
                  {tab.label}
                </option>
              ))}
            </select>
            <div className="flex items-center pr-2 pointer-events-none">
              <LayoutGrid className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="relative border-b border-gray-700/70">
        {/* Desktop Tabs */}
        <div className={`hidden sm:block px-6`}>
          <ul className="flex space-x-1">
            {TABS.map((tab) => (
              <li key={tab.path}>
                <NavLink
                  className={({ isActive }) =>
                    twJoin(
                      'flex items-center gap-2 py-3 px-4 font-medium transition-all duration-200 relative rounded-t-lg',
                      isActive
                        ? `text-white`
                        : `text-gray-400 hover:text-gray-200 hover:bg-gray-800/50`
                    )
                  }
                  to={tab.path}
                >
                  <div
                    className={`rounded-full p-1 ${location.pathname.startsWith(tab.path) ? getIconBgColor(tab.color) : 'text-gray-400'}`}
                  >
                    {tab.icon}
                  </div>
                  <span>{tab.label}</span>

                  {/* Active indicator */}
                  {location.pathname.startsWith(tab.path) && (
                    <div
                      className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r ${getIndicatorColor()} rounded-t-lg`}
                    />
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Dynamic indicator - removed tabIndicatorStyle */}
        <div className="absolute bottom-0 h-0.5 bg-gradient-to-r rounded-full transition-all duration-300 hidden sm:block" />
      </div>

      {/* Content Area */}
      <div className="p-6">
        <Outlet />

        {/* Empty state placeholder */}
        <div className="empty-state hidden">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className={`p-4 rounded-full ${getIconBgColor(activeTab.color)} mb-4`}
            >
              {activeTab.icon}
            </div>
            <h3 className="text-xl font-medium text-white mb-2">
              No {activeTab.label.toLowerCase()} yet
            </h3>
            <p className="text-gray-400 max-w-md">
              When you make {activeTab.label.toLowerCase()}, they will appear
              here for easy tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Footer with pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700/50 bg-gray-800/30">
        <div className="text-sm text-gray-400">
          Showing 1-10 of 24 transactions
        </div>
        <div className="flex space-x-1">
          <button className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm border border-gray-700">
            Previous
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm border border-gray-700">
            Next
          </button>
        </div>
      </div>
    </Card>
  )
}
