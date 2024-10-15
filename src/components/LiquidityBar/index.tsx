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

  // Define colors based on the type
  const colors = {
    asset: {
      local: 'bg-blue-500',
      remote: 'bg-blue-500 opacity-50',
    },
    bitcoin: {
      local: 'bg-yellow-500',
      remote: 'bg-yellow-500 opacity-50',
    },
  }

  return (
    <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden mt-2">
      <div
        className={`${colors[type].local} h-full`}
        style={{ width: `${localPercentage}%` }}
      ></div>
      <div
        className={`${colors[type].remote} h-full`}
        style={{ width: `${remotePercentage}%` }}
      ></div>
    </div>
  )
}
