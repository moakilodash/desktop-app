import { Link, Plus, ShoppingCart } from 'lucide-react'
import React from 'react'

import {
  CREATE_NEW_CHANNEL_PATH,
  ORDER_CHANNEL_PATH,
} from '../../app/router/paths'

interface NoChannelsMessageProps {
  onNavigate: (path: string) => void
}

export const NoChannelsMessage: React.FC<NoChannelsMessageProps> = ({
  onNavigate,
}) => (
  <div className="max-w-xl w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-8">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
        <Link className="w-8 h-8 text-blue-500" />
      </div>
      <h2 className="text-2xl font-bold text-white">No Channels Available</h2>
      <p className="text-slate-400 text-center">
        You need to open a channel with an asset to start trading.
      </p>
      <div className="flex gap-4 pt-4">
        <button
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl 
                   font-medium transition-colors flex items-center gap-2"
          onClick={() => onNavigate(CREATE_NEW_CHANNEL_PATH)}
        >
          <Plus className="w-5 h-5" />
          Open Channel
        </button>
        <button
          className="px-6 py-3 border border-blue-500/50 text-blue-500 rounded-xl 
                   hover:bg-blue-500/10 transition-colors flex items-center gap-2"
          onClick={() => onNavigate(ORDER_CHANNEL_PATH)}
        >
          <ShoppingCart className="w-5 h-5" />
          Buy from LSP
        </button>
      </div>
    </div>
  </div>
)
