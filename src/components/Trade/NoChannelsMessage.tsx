import { openUrl } from '@tauri-apps/plugin-opener'
import {
  Link,
  Plus,
  ShoppingCart,
  HelpCircle,
  Wallet,
  ExternalLink,
} from 'lucide-react'
import React from 'react'

import {
  CREATE_NEW_CHANNEL_PATH,
  ORDER_CHANNEL_PATH,
} from '../../app/router/paths'
import { useAppDispatch } from '../../app/store/hooks'
import { uiSliceActions } from '../../slices/ui/ui.slice'

import { MakerSelector } from './MakerSelector'

interface NoChannelsMessageProps {
  onNavigate: (path: string) => void
  onMakerChange: () => Promise<void>
  hasEnoughBalance?: boolean
}

export const NoChannelsMessage: React.FC<NoChannelsMessageProps> = ({
  onNavigate,
  hasEnoughBalance = true,
}) => {
  const dispatch = useAppDispatch()

  const handleShowDepositModal = () => {
    dispatch(uiSliceActions.setModal({ assetId: undefined, type: 'deposit' }))
  }

  if (!hasEnoughBalance) {
    return (
      <div className="max-w-2xl w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <Wallet className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            Insufficient Bitcoin Balance
          </h2>
          <p className="text-slate-400 text-center text-base max-w-md">
            You need some bitcoin to open a channel. Please deposit some BTC to
            get started.
          </p>

          <div className="flex gap-3 pt-4">
            <button
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl 
                     font-medium transition-colors flex items-center gap-2 text-base"
              onClick={handleShowDepositModal}
            >
              <Wallet className="w-5 h-5" />
              Deposit BTC
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-8">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
          <Link className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">
          No RGB Channels Available
        </h2>
        <p className="text-slate-400 text-center text-base max-w-md">
          To start swapping, you need to a channel with some assets
        </p>

        <div className="flex gap-4 pt-4">
          <button
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl 
                     font-medium transition-colors flex items-center gap-2 text-base"
            onClick={() => onNavigate(CREATE_NEW_CHANNEL_PATH)}
          >
            <Plus className="w-5 h-5" />
            Open Channel
          </button>
          <button
            className="px-6 py-3 border border-blue-500/50 text-blue-500 rounded-xl 
                     hover:bg-blue-500/10 transition-colors flex items-center gap-2 text-base"
            onClick={() => onNavigate(ORDER_CHANNEL_PATH)}
          >
            <ShoppingCart className="w-5 h-5" />
            Buy from LSP
          </button>
        </div>
      </div>
    </div>
  )
}

interface NoTradingChannelsMessageProps {
  onNavigate: (path: string) => void
  onMakerChange: () => Promise<void>
  hasEnoughBalance?: boolean
}

export const NoTradingChannelsMessage: React.FC<
  NoTradingChannelsMessageProps
> = ({ onNavigate, onMakerChange, hasEnoughBalance = true }) => {
  const dispatch = useAppDispatch()

  const handleShowDepositModal = () => {
    dispatch(uiSliceActions.setModal({ assetId: undefined, type: 'deposit' }))
  }

  const handleViewMakerRegistry = () => {
    openUrl('https://registry.kaleidoswap.com')
  }

  if (!hasEnoughBalance) {
    return (
      <div className="max-w-2xl w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <Wallet className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            Insufficient Bitcoin Balance
          </h2>
          <p className="text-slate-400 text-center text-base max-w-md">
            You need some bitcoin to open a trading channel. Please deposit some
            BTC to get started.
          </p>

          <div className="flex gap-3 pt-4">
            <button
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl 
                     font-medium transition-colors flex items-center gap-2 text-base"
              onClick={handleShowDepositModal}
            >
              <Wallet className="w-5 h-5" />
              Deposit BTC
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 overflow-hidden">
      <div className="border-b border-slate-700/50 px-4 pt-3 pb-2">
        <MakerSelector hasNoPairs onMakerChange={onMakerChange} />
      </div>
      <div className="p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
            <Link className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            No Trading Channels Available
          </h2>
          <p className="text-slate-400 text-center text-base max-w-lg">
            To trade with this market maker, you need a channel with one of its{' '}
            <span className="text-blue-400 font-medium">supported assets</span>.
            Each market maker supports different assets and trading pairs.
          </p>

          <div className="mt-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700/30 w-full max-w-lg">
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-400" />
              How to get started
            </h3>
            <ul className="text-sm text-slate-400 space-y-3">
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">
                  1
                </div>
                <span>
                  Check the{' '}
                  <button
                    className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-medium"
                    onClick={handleViewMakerRegistry}
                  >
                    Market Maker Registry{' '}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>{' '}
                  to see supported assets and pairs
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">
                  2
                </div>
                <div>
                  <span>You have two options to get a trading channel:</span>
                  <ul className="ml-6 space-y-1 mt-1">
                    <li className="text-sm text-slate-400">
                      • Open a channel directly if you already own supported
                      assets on-chain
                    </li>
                    <li className="text-sm text-slate-400">
                      • Purchase a channel with a supported asset from an LSP
                    </li>
                  </ul>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">
                  3
                </div>
                <span>
                  Return here to start trading once your channel is active
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3 pt-4 justify-center">
            <button
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg 
                     font-medium transition-colors flex items-center gap-2 text-base shadow-md"
              onClick={() => onNavigate(ORDER_CHANNEL_PATH)}
            >
              <ShoppingCart className="w-5 h-5" />
              Buy Channel from LSP
            </button>
            <button
              className="px-5 py-2.5 border border-blue-500/50 text-blue-500 rounded-lg 
                hover:bg-blue-500/10 transition-colors flex items-center gap-2 text-base shadow-sm"
              onClick={() => onNavigate(CREATE_NEW_CHANNEL_PATH)}
            >
              <Plus className="w-5 h-5" />
              Open Channel Directly
            </button>
          </div>
          <button
            className="mt-3 px-4 py-2 border border-slate-500/50 text-slate-300 rounded-lg 
                   hover:bg-slate-700/50 transition-colors flex items-center gap-1.5 text-sm"
            onClick={handleViewMakerRegistry}
          >
            <ExternalLink className="w-4 h-4" />
            View Supported Assets
          </button>
        </div>
      </div>
    </div>
  )
}
