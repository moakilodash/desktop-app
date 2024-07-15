import React from 'react'

interface LiquidityBarProps {
  localAmount: number
  remoteAmount: number
}

export const LiquidityBar: React.FC<LiquidityBarProps> = ({
  localAmount,
  remoteAmount,
}) => {
  const totalAmount = localAmount + remoteAmount
  const localAmountPercentage = (localAmount / totalAmount) * 100
  const remoteAmountPercentage = (remoteAmount / totalAmount) * 100

  return (
    <div className="w-full h-6 bg-gray-300 rounded-full overflow-hidden relative">
      <div
        className="h-full bg-purple transition-all duration-300 ease-in-out"
        style={{ width: `${localAmountPercentage}%` }}
        title={`Local: ${localAmount.toFixed(2)} (${localAmountPercentage.toFixed(0)}%)`}
      />
      <div
        className="h-full bg-cyan transition-all duration-300 ease-in-out absolute right-0"
        style={{ width: `${remoteAmountPercentage}%` }}
        title={`Remote: ${remoteAmount.toFixed(2)} (${remoteAmountPercentage.toFixed(0)}%)`}
      />
    </div>
  )
}
