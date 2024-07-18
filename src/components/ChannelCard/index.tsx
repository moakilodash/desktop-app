import { ArrowUpRight, ArrowDownRight, X } from 'lucide-react'
import React, { useState } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  children: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  children,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Confirm Action</h3>
          <button className="text-gray-400 hover:text-white" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        {children}
        <div className="flex justify-end space-x-4 mt-6">
          <button
            className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

interface ChannelCardProps {
  channel: any
  onClose: (channelId: string, peerPubkey: string) => void
  assets: any
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  onClose,
  assets,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      })
      .catch((err) => console.error('Failed to copy: ', err))
  }

  const handleCloseChannel = async () => {
    setIsClosing(true)
    await onClose(channel.channel_id, channel.peer_pubkey)
    setIsClosing(false)
    setIsModalOpen(false)
  }

  const assetTicker = assets[channel.asset_id]?.ticker || 'BTC'
  const assetPrecision = assets[channel.asset_id]?.precision || 8
  const peerName = channel.peer_alias || channel.peer_pubkey.slice(0, 8)

  const formatAssetAmount = (amount) => {
    const factor = Math.pow(10, assetPrecision)
    return (amount / factor).toLocaleString(undefined, {
      maximumFractionDigits: assetPrecision,
      minimumFractionDigits: assetPrecision,
    })
  }

  return (
    <div className="relative bg-gray-800 text-white rounded-lg shadow p-4">
      <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg"></div>
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold">{peerName}</span>
            <button
              className="text-gray-400 hover:text-white transition-colors"
              onClick={() => copyToClipboard(channel.channel_id)}
              title={isCopied ? 'Copied!' : 'Copy Channel ID'}
            >
              {isCopied ? '✓' : '📋'}
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs px-2 py-1 rounded ${channel.ready ? 'bg-green-500' : 'bg-yellow-500'}`}
            >
              {channel.ready ? 'Open' : 'Pending'}
            </span>
            {channel.public ? '🔓' : '🔒'}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-400">Total Capacity</p>
          <div className="text-2xl font-bold mb-1">
            {channel.capacity_sat.toLocaleString()} sats
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div className="flex items-center">
            <ArrowUpRight className="mr-2 h-4 w-4 text-gray-400" />
            <div>
              <div className="text-gray-400">Outbound</div>
              <div>
                {Math.floor(
                  channel.outbound_balance_msat / 1000
                ).toLocaleString()}{' '}
                sats
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <ArrowDownRight className="mr-2 h-4 w-4 text-gray-400" />
            <div>
              <div className="text-gray-400">Inbound</div>
              <div>
                {Math.floor(
                  channel.inbound_balance_msat / 1000
                ).toLocaleString()}{' '}
                sats
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between text-sm text-gray-400 mb-4">
          <div>
            Local: {formatAssetAmount(channel.asset_local_amount)} {assetTicker}
          </div>
          <div>
            Remote: {formatAssetAmount(channel.asset_remote_amount)}{' '}
            {assetTicker}
          </div>
        </div>

        <button
          className={`w-full py-2 px-4 rounded font-bold text-white ${
            isClosing
              ? 'bg-orange-700 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700 transition-colors'
          }`}
          disabled={isClosing}
          onClick={() => setIsModalOpen(true)}
        >
          {isClosing ? 'Closing...' : 'Close Channel'}
        </button>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleCloseChannel}
        >
          <p>Are you sure you want to close this channel with {peerName}?</p>
        </Modal>
      </div>
    </div>
  )
}
