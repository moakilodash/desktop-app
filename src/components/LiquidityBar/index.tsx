import React from 'react'

interface LiquidityBarProps {
  localAmount: number
  remoteAmount: number
  type: 'bitcoin' | 'asset'
}

export const LiquidityBar: React.FC<LiquidityBarProps> = ({
  localAmount,
  remoteAmount,
  type,
}) => {
  const total = localAmount + remoteAmount
  const localPercentage = total === 0 ? 0 : (localAmount / total) * 100
  const remotePercentage = total === 0 ? 0 : (remoteAmount / total) * 100

  // Determine if the channel is well-balanced (at least 20% on each side)
  const isWellBalanced = localPercentage >= 20 && remotePercentage >= 20

  // Define colors based on the type and balance
  const getLocalColor = () => {
    if (type === 'bitcoin') {
      if (localPercentage < 20) return 'bg-red-500'
      if (localPercentage > 80) return 'bg-blue-500'
      return 'bg-yellow-500'
    } else {
      // Asset colors
      if (localPercentage < 20) return 'bg-purple-500'
      if (localPercentage > 80) return 'bg-indigo-600'
      return 'bg-blue-500'
    }
  }

  const getRemoteColor = () => {
    if (type === 'bitcoin') {
      return 'bg-yellow-500 opacity-50'
    } else {
      return 'bg-blue-500 opacity-50'
    }
  }

  return (
    <div className="space-y-1">
      <div className="relative w-full bg-gray-700 rounded-full h-4 overflow-hidden">
        {/* Local amount (left side) */}
        <div
          className={`${getLocalColor()} h-full absolute left-0 top-0 rounded-l-full transition-all duration-200`}
          style={{ width: `${localPercentage}%` }}
        ></div>

        {/* Remote amount (right side) */}
        <div
          className={`${getRemoteColor()} h-full absolute right-0 top-0 rounded-r-full transition-all duration-200`}
          style={{ width: `${remotePercentage}%` }}
        ></div>

        {/* Balance indicator in the middle */}
        {isWellBalanced && (
          <div className="absolute top-0 bottom-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-white/30"></div>
        )}
      </div>

      {/* Only show text labels if needed */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>Local</span>
        <span>Remote</span>
      </div>
    </div>
  )
}
