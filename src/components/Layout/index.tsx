import { NavLink, useLocation } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'

import {
  TRADE_PATH,
  WALLET_HISTORY_DEPOSITS_PATH,
  WALLET_HISTORY_PATH,
} from '../../app/router/paths'
import logo from '../../assets/logo.svg'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'

import { ChannelMenu } from './ChannelMenu'
import { LayoutModal } from './Modal'
import { WalletMenu } from './WalletMenu'

import 'react-toastify/dist/ReactToastify.min.css'
import { useEffect, useState } from 'react'

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

  const location = useLocation()
  const nodeInfo = nodeApi.endpoints.nodeInfo.useQueryState()

  const { data } = nodeApi.useListTransactionsQuery(
    { skip_sync: false },
    { pollingInterval: 10_000 }
  )

  useEffect(() => {
    console.log('Checking for deposits')
    const highestBlockDeposit = data?.transactions
      .filter((transaction) => transaction.transaction_type === 'User')
      .reduce((prev, current) =>
        prev?.confirmation_time?.height > current?.confirmation_time?.height
          ? prev
          : current
      )
    if (
      lastDeposit &&
      highestBlockDeposit &&
      highestBlockDeposit?.confirmation_time?.height > lastDeposit
    ) {
      console.log('Deposit received')
      toast.info('Deposit received')
    }

    setLastDeposit(highestBlockDeposit?.confirmation_time?.height)
  }, [data])

  return (
    <div className={props.className}>
      <div className="min-h-screen flex">
        <div className="px-16 py-14 min-h-screen min-w-full flex flex-col">
          <header className="flex items-center mb-20">
            <img alt="KaleidoSwap" src={logo} />

            {nodeInfo.isSuccess ? (
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
            ) : null}
          </header>

          <main className="flex justify-center items-center flex-1">
            {props.children}
          </main>
        </div>
      </div>
      <LayoutModal />
      <ToastContainer />
    </div>
  )
}
