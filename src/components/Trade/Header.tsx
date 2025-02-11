import React from 'react'

import { MakerSelector } from './MakerSelector'

interface HeaderProps {
  showWarning?: boolean
  hasValidChannelsForTrading?: boolean
  onMakerChange: () => Promise<void>
}

export const Header: React.FC<HeaderProps> = ({
  showWarning = false,
  hasValidChannelsForTrading = true,
  onMakerChange,
}) => (
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-semibold text-white">Trade</h2>
    <MakerSelector
      hasNoPairs={showWarning}
      onMakerChange={onMakerChange}
      show={hasValidChannelsForTrading}
    />
  </div>
)
