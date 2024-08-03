import { NavLink, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'

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
import { Gear } from '../../icons/Gear'

interface Props {
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
  const location = useLocation()
  const nodeInfo = nodeApi.endpoints.nodeInfo.useQueryState()

  return (
    <>
      <div className="min-h-screen flex">
        <aside className="fixed h-full w-16 bg-gray-900 items-center shadow-lg flex flex-col justify-between py-4">
          <div></div>
          <div>
            <NavLink to="/node-settings">
              <Gear fill="gray" height={40} width={40} />
            </NavLink>
          </div>
        </aside>
        <div className="pe-16 ps-24 py-14 min-h-screen min-w-full flex flex-col">
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
    </>
  )
}
