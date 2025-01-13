import { ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'

import {
  TRADE_PATH,
  WALLET_HISTORY_DEPOSITS_PATH,
  WALLET_HISTORY_PATH,
  WALLET_SETUP_PATH,
} from '../../app/router/paths'
import logo from '../../assets/logo.svg'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { Toolbar } from '../Toolbar'

import { ChannelMenu } from './ChannelMenu'
import { LayoutModal } from './Modal'
import { WalletMenu } from './WalletMenu'
import 'react-toastify/dist/ReactToastify.min.css'
import Decimal from 'decimal.js'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface Props {
  className?: string
  children: React.ReactNode
}

const NAV_ITEMS = [
  {
    label: 'Trade',
    matchPath: TRADE_PATH,
    to: TRADE_PATH,
  },
  {
    label: 'History',
    matchPath: WALLET_HISTORY_PATH,
    to: WALLET_HISTORY_DEPOSITS_PATH,
  },
]

export const Layout = (props: Props) => {
  const [lastDeposit, setLastDeposit] = useState<number | undefined>(undefined)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const nodeInfo = nodeApi.endpoints.nodeInfo.useQueryState()
  const shouldPoll = nodeInfo.isSuccess

  const { data, isFetching, error } = nodeApi.useListTransactionsQuery(
    { skip_sync: false },
    {
      pollingInterval: 30_000,
      skip: isRetrying || !shouldPoll,
    }
  )

  useEffect(() => {
    const checkDeposits = async () => {
      if (!shouldPoll) return
      if (isFetching) return

      if (error && 'status' in error && error.status === 403) {
        console.log('Node is locked, waiting to retry...')
        setIsRetrying(true)
        await sleep(3000)
        setIsRetrying(false)
        return
      }

      const filteredTransactions =
        data?.transactions
          .filter(
            (tx) =>
              tx.transaction_type === 'User' &&
              new Decimal(tx.received).minus(tx.sent).gt(0)
          )
          .map((tx) => ({
            amount: new Decimal(tx.received).minus(tx.sent).toString(),
            asset: 'BTC',
            confirmation_time: tx.confirmation_time,
            txId: tx.txid,
            type: 'on-chain' as const,
          })) || []

      const highestBlockDeposit =
        filteredTransactions && filteredTransactions.length > 0
          ? filteredTransactions?.reduce((prev, current) =>
              prev?.confirmation_time?.height >
              current?.confirmation_time?.height
                ? prev
                : current
            )
          : undefined

      if (lastDeposit === undefined) {
        if (highestBlockDeposit) {
          setLastDeposit(highestBlockDeposit?.confirmation_time?.height)
        } else {
          setLastDeposit(0)
        }
        return
      }

      if (
        lastDeposit !== undefined &&
        highestBlockDeposit &&
        highestBlockDeposit?.confirmation_time?.height > lastDeposit
      ) {
        console.log('Deposit received')
        toast.info('Deposit received')
        setLastDeposit(highestBlockDeposit?.confirmation_time?.height)
      }
    }

    checkDeposits()
  }, [data, error, shouldPoll, lastDeposit])

  const isWalletSetup = location.pathname === WALLET_SETUP_PATH
  const isNodeConnected = nodeInfo.isSuccess

  return (
    <div className={props.className}>
      <div className="min-h-screen flex">
        {isWalletSetup ? (
          // Full wallet setup view with sidebar
          <div className="flex w-full">
            {!isNodeConnected && (
              // Show sidebar only when no node is connected
              <div
                className={`flex flex-col fixed left-0 top-0 h-screen bg-blue-darkest border-r border-divider/10
                transition-all duration-300 ease-in-out z-50 group
                ${isSidebarCollapsed ? 'w-16' : 'w-72'}`}
              >
                <div className="flex items-center justify-between p-4 border-b border-divider/10">
                  <img
                    alt="KaleidoSwap"
                    className={`h-8 cursor-pointer ${isSidebarCollapsed ? 'w-8' : 'w-auto'}`}
                    onClick={() => navigate(WALLET_SETUP_PATH)}
                    src={logo}
                  />
                  <button
                    className="p-2 rounded-lg text-gray-400 hover:text-white 
                      hover:bg-blue-darker transition-colors duration-200"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  >
                    {isSidebarCollapsed ? (
                      <ChevronRight size={20} />
                    ) : (
                      <ChevronLeft size={20} />
                    )}
                  </button>
                </div>

                <Toolbar isCollapsed={isSidebarCollapsed} />
              </div>
            )}

            {/* Main wallet setup content */}
            <main
              className={`flex-1 min-h-screen bg-gradient-to-br from-blue-darker to-blue-darkest
              ${!isNodeConnected ? (isSidebarCollapsed ? 'ml-16' : 'ml-72') : ''}`}
            >
              {props.children}
            </main>
          </div>
        ) : (
          // Regular header for other routes
          <div className="px-16 py-14 min-h-screen min-w-full flex flex-col">
            <header className="flex items-center mb-20">
              <img
                alt="KaleidoSwap"
                className="cursor-pointer"
                onClick={() => navigate(WALLET_SETUP_PATH)}
                src={logo}
              />

              {isNodeConnected && (
                <>
                  <nav className="flex-1 ml-16">
                    <ul className="flex space-x-6 items-center">
                      {NAV_ITEMS.map((item) => {
                        const isActive = new RegExp(item.matchPath).test(
                          location.pathname
                        )

                        return (
                          <li className="p-2 font-medium" key={item.to}>
                            <NavLink
                              className={isActive ? 'text-cyan' : undefined}
                              to={item.to}
                            >
                              {item.label}
                            </NavLink>
                          </li>
                        )
                      })}
                    </ul>
                  </nav>

                  <div className="flex space-x-6 items-center">
                    <ChannelMenu />
                    <WalletMenu />
                  </div>
                </>
              )}
            </header>

            <main className="flex justify-center items-center flex-1">
              {props.children}
            </main>
          </div>
        )}
      </div>

      <LayoutModal />
      <ToastContainer
        autoClose={5000}
        closeOnClick={false}
        draggable={false}
        hideProgressBar={false}
        newestOnTop={false}
        pauseOnFocusLoss={false}
        pauseOnHover={true}
        position="bottom-right"
        rtl={false}
        theme="dark"
      />
    </div>
  )
}
