import { Wallet, ArrowLeftRight, Cloud } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import {
  INIT_PATH,
  WALLET_CONFIG_PATH,
  WALLET_RESTORE_PATH,
} from '../../app/router/paths'
import { Layout } from '../../components/Layout'

import { Toolbar } from './Toolbar'

interface WalletOptionProps {
  title: string
  description: string
  icon: React.FC<React.SVGProps<SVGSVGElement>>
  onClick: () => void
}

const WalletOption: React.FC<WalletOptionProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
}) => (
  <div className="bg-blue-dark p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full">
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-cyan bg-opacity-20 p-3 rounded-full">
        <Icon className="w-8 h-8 text-cyan" />
      </div>
      <h2 className="text-2xl font-bold text-white">{title}</h2>
    </div>
    <p className="text-gray-300 mb-6 flex-grow">{description}</p>
    <button
      className="w-full px-4 py-3 bg-cyan text-blue-dark rounded-md font-bold hover:bg-cyan-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan focus:ring-opacity-50"
      onClick={onClick}
    >
      Select
    </button>
  </div>
)

export const Component = () => {
  const navigate = useNavigate()

  return (
    <div className="relative">
      <Toolbar />
      <Layout className="ml-64">
        <div className="max-w-5xl w-full p-8 bg-blue-darker rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold mb-2 text-center text-white">
            Welcome to KaleidoSwap
          </h1>
          <p className="text-gray-300 text-center mb-10">
            Choose an option to get started with your KaleidoSwap journey
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <WalletOption
              description="Set up a new wallet and start fresh with your cryptocurrency"
              icon={Wallet}
              onClick={() => navigate(INIT_PATH)}
              title="Create New Wallet"
            />
            <WalletOption
              description="Recover your existing wallet from a backup or seed phrase"
              icon={ArrowLeftRight}
              onClick={() => navigate(WALLET_RESTORE_PATH)}
              title="Restore Wallet"
            />
            <WalletOption
              description="Connect to an existing remote RGB Lightning node"
              icon={Cloud}
              onClick={() => navigate(WALLET_CONFIG_PATH)}
              title="Connect to Remote Node"
            />
          </div>
        </div>
      </Layout>
    </div>
  )
}
