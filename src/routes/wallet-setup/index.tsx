import { Wallet, ArrowLeftRight, Lock } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import {
  INIT_PATH,
  WALLET_RESTORE_PATH,
  WALLET_UNLOCK_PATH,
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
  <div className="bg-blue-dark p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-6 h-6 text-cyan" />
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
    <p className="text-gray-400 mb-4 flex-grow">{description}</p>
    <button
      className="w-full px-4 py-2 bg-cyan text-blue-dark rounded font-bold hover:bg-cyan-600 transition-colors duration-300"
      onClick={onClick}
    >
      Select
    </button>
  </div>
)

export const Component = () => {
  const navigate = useNavigate()

  return (
    <>
      <Toolbar />
      <Layout className="ms-12">
        <div className="max-w-4xl w-full p-6 bg-blue-darker rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-6 text-center text-white">
            Wallet Options
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <WalletOption
              description="Set up a new wallet for your cryptocurrency"
              icon={Wallet}
              onClick={() => navigate(INIT_PATH)}
              title="Create Wallet"
            />
            <WalletOption
              description="Recover your wallet from a backup"
              icon={ArrowLeftRight}
              onClick={() => navigate(WALLET_RESTORE_PATH)}
              title="Restore Wallet"
            />
            <WalletOption
              description="Access your existing wallet"
              icon={Lock}
              onClick={() => navigate(WALLET_UNLOCK_PATH)}
              title="Unlock Wallet"
            />
          </div>
        </div>
      </Layout>
    </>
  )
}
