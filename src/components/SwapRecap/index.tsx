import { X } from 'lucide-react'
import React from 'react'

export interface SwapDetails {
  fromAmount: string
  fromAsset: string
  toAmount: string
  toAsset: string
  exchangeRate: string
  timestamp: string
}

interface SwapRecapProps {
  isOpen: boolean
  onClose: () => void
  swapDetails: SwapDetails
}

export const SwapRecap: React.FC<SwapRecapProps> = ({
  isOpen,
  onClose,
  swapDetails,
}) => {
  const { fromAmount, fromAsset, toAmount, toAsset, exchangeRate, timestamp } =
    swapDetails

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-blue-dark text-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Swap Recap</h2>
          <button className="text-gray-400 hover:text-white" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">You sent:</span>
            <span className="font-bold">
              {fromAmount} {fromAsset}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">You received:</span>
            <span className="font-bold">
              {toAmount} {toAsset}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Exchange rate:</span>
            <span>{exchangeRate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Timestamp:</span>
            <span>{new Date(timestamp).toLocaleString()}</span>
          </div>
        </div>
        <button
          className="w-full bg-cyan text-blue-dark py-2 rounded-lg font-bold hover:bg-cyan-dark transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}
