import { RefreshCw } from 'lucide-react'
import React from 'react'

interface NoTradingPairsMessageProps {
  wsConnected: boolean
  isLoading: boolean
  onRefresh: () => void
}

export const NoTradingPairsMessage: React.FC<NoTradingPairsMessageProps> = ({
  wsConnected,
  isLoading,
  onRefresh,
}) => (
  <div className="max-w-xl w-full bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-6">
    <div className="text-center space-y-3">
      <h3 className="text-lg font-bold text-white">
        {!wsConnected ? 'Maker Not Connected' : 'No Trading Pairs Available'}
      </h3>
      <p className="text-slate-400 text-sm">
        {!wsConnected
          ? 'Unable to connect to the selected maker. Please select a different maker from the dropdown above.'
          : "The current maker doesn't offer any trading pairs for your assets. Please select a different maker from the dropdown above."}
      </p>
      <button
        className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                 font-medium transition-colors flex items-center gap-2 mx-auto text-sm"
        disabled={isLoading}
        onClick={onRefresh}
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        {isLoading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  </div>
)
