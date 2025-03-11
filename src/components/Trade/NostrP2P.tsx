import { openUrl } from '@tauri-apps/plugin-opener'
import { Users, Zap, Clock, Bell, ArrowRight, Globe } from 'lucide-react'
import React from 'react'

export const NostrP2P: React.FC = () => {
  return (
    <div className="bg-gradient-to-b from-slate-900/80 to-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 shadow-lg">
      <div className="flex flex-col items-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
          <div className="relative p-4 bg-blue-600/20 rounded-full">
            <Users className="w-10 h-10 text-blue-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">
          Nostr P2P Trading
        </h2>
        <p className="text-slate-400 text-center mb-8">
          Peer-to-peer trading via Nostr is coming soon! Trade directly with
          other users without relying on centralized makers.
        </p>

        <div className="space-y-4 w-full mb-8">
          <div className="bg-slate-800 rounded-lg p-5 flex items-center border border-slate-700/50 hover:border-blue-500/30 hover:bg-slate-800/80 transition-all">
            <Zap className="w-8 h-8 text-blue-400 mr-4 flex-shrink-0" />
            <div>
              <h3 className="text-white font-medium mb-1">Direct Swaps</h3>
              <p className="text-sm text-slate-400">
                Trade directly with peers without intermediaries
              </p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-5 flex items-center border border-slate-700/50 hover:border-blue-500/30 hover:bg-slate-800/80 transition-all">
            <Clock className="w-8 h-8 text-blue-400 mr-4 flex-shrink-0" />
            <div>
              <h3 className="text-white font-medium mb-1">Limit Orders</h3>
              <p className="text-sm text-slate-400">
                Set your price and wait for matches
              </p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-5 flex items-center border border-slate-700/50 hover:border-blue-500/30 hover:bg-slate-800/80 transition-all">
            <Bell className="w-8 h-8 text-blue-400 mr-4 flex-shrink-0" />
            <div>
              <h3 className="text-white font-medium mb-1">Notifications</h3>
              <p className="text-sm text-slate-400">
                Get alerts when your orders match
              </p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-5 flex items-center border border-slate-700/50 hover:border-blue-500/30 hover:bg-slate-800/80 transition-all">
            <ArrowRight className="w-8 h-8 text-blue-400 mr-4 flex-shrink-0" />
            <div>
              <h3 className="text-white font-medium mb-1">Trustless Swaps</h3>
              <p className="text-sm text-slate-400">
                Atomic swaps ensure both parties receive their assets or the
                trade doesn't happen
              </p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-5 flex items-center border border-slate-700/50 hover:border-blue-500/30 hover:bg-slate-800/80 transition-all">
            <Globe className="w-8 h-8 text-blue-400 mr-4 flex-shrink-0" />
            <div>
              <h3 className="text-white font-medium mb-1">
                Global Marketplace
              </h3>
              <p className="text-sm text-slate-400">
                Connect with traders worldwide through the Nostr network
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-4 w-full">
          <p className="text-blue-400 text-sm text-center">
            Want to be notified when Nostr P2P trading launches?{' '}
            <button
              className="text-blue-400 underline hover:text-blue-300"
              onClick={() =>
                openUrl('https://github.com/BitSwap-BiFi/Kaleidoswap')
              }
            >
              Star our GitHub repo
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
