import {
  ArrowUpRight,
  ArrowDownRight,
  X,
  Lock,
  Unlock,
  Info,
} from 'lucide-react'
import React, { useState } from 'react'

import { useAppSelector } from '../../app/store/hooks'
import { DEFAULT_RGB_ICON } from '../../constants'
import { formatBitcoinAmount } from '../../helpers/number'
import { useAssetIcon } from '../../helpers/utils'
import { LiquidityBar } from '../LiquidityBar' // Import LiquidityBar

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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full shadow-xl border border-gray-700/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Confirm Action</h3>
          <button
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700/50"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        {children}
        <div className="flex justify-end space-x-4 mt-6">
          <button
            className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            type="button"
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
            onClick={(e) => {
              e.stopPropagation()
              onConfirm()
            }}
            type="button"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
  channel: any
  asset: any
  bitcoinUnit: string
}

const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  channel,
  asset,
  bitcoinUnit,
}) => {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const infoRows = [
    { label: 'Channel ID', value: channel.channel_id },
    { label: 'Funding Transaction', value: channel.funding_txid },
    { label: 'Peer Public Key', value: channel.peer_pubkey },
    {
      label: 'Short Channel ID',
      value: channel.short_channel_id?.toString() || 'N/A',
    },
    { label: 'Status', value: channel.status },
    {
      label: 'Capacity',
      value: `${formatBitcoinAmount(channel.capacity_sat, bitcoinUnit)} ${bitcoinUnit}`,
    },
    {
      label: 'Local Balance',
      value: `${formatBitcoinAmount(channel.local_balance_sat, bitcoinUnit)} ${bitcoinUnit}`,
    },
    {
      label: 'Next HTLC Limit',
      value: `${formatBitcoinAmount(channel.next_outbound_htlc_limit_msat / 1000, bitcoinUnit)} ${bitcoinUnit}`,
    },
    {
      label: 'Next HTLC Minimum',
      value: `${formatBitcoinAmount(channel.next_outbound_htlc_minimum_msat / 1000, bitcoinUnit)} ${bitcoinUnit}`,
    },
    { label: 'Public Channel', value: channel.public ? 'Yes' : 'No' },
    { label: 'Usable', value: channel.is_usable ? 'Yes' : 'No' },
  ]

  if (channel.asset_id) {
    const assetPrecision = asset?.precision || 8
    const formatAssetAmount = (amount: number) => {
      const factor = Math.pow(10, assetPrecision)
      return (amount / factor).toLocaleString(undefined, {
        maximumFractionDigits: assetPrecision,
        minimumFractionDigits: assetPrecision,
      })
    }

    infoRows.push(
      { label: 'Asset ID', value: channel.asset_id },
      {
        label: 'Asset Local Amount',
        value: `${formatAssetAmount(channel.asset_local_amount)} ${asset?.ticker}`,
      },
      {
        label: 'Asset Remote Amount',
        value: `${formatAssetAmount(channel.asset_remote_amount)} ${asset?.ticker}`,
      }
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl border border-gray-700/50">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Channel Information</h3>
          <button
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700/50"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
        <div className="grid gap-4">
          {infoRows.map((row, index) => (
            <div
              className="border-b border-gray-700 pb-3 last:border-0"
              key={index}
            >
              <div className="text-sm text-gray-400">{row.label}</div>
              <div className="font-medium break-all">{row.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

interface ChannelCardProps {
  channel: any
  onClose: (channelId: string, peerPubkey: string) => void
  asset: any // Changed from assets to asset
}

const AssetIcon: React.FC<{ ticker: string; className?: string }> = ({
  ticker,
  className = 'h-6 w-6 mr-2',
}) => {
  const [imgSrc, setImgSrc] = useAssetIcon(ticker)

  return (
    <img
      alt={`${ticker} icon`}
      className={className}
      onError={() => setImgSrc(DEFAULT_RGB_ICON)}
      src={imgSrc}
    />
  )
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  onClose,
  asset,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const bitcoinUnit = useAppSelector((state) => state.settings.bitcoinUnit)

  const handleCloseChannel = async () => {
    onClose(channel.channel_id, channel.peer_pubkey)
    setIsModalOpen(false)
  }

  const assetPrecision = asset?.precision || 8

  const formatAssetAmount = (amount: number) => {
    const factor = Math.pow(10, assetPrecision)
    return (amount / factor).toLocaleString(undefined, {
      maximumFractionDigits: assetPrecision,
      minimumFractionDigits: 0,
    })
  }

  const isRgbChannel = !!channel.asset_id

  // Determine channel status for styling
  const isReady = channel.ready
  const isPublic = channel.public

  // Get background style based on channel type
  const getCardBackground = () => {
    if (isRgbChannel) {
      return 'bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950/30'
    }
    return 'bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/30'
  }

  // Get border style based on channel type and status
  const getBorderStyle = () => {
    if (!isReady) {
      return 'border-2 border-yellow-500/40'
    }

    if (isRgbChannel) {
      return 'border-2 border-purple-500/40'
    }

    return 'border-2 border-blue-500/40'
  }

  return (
    <div
      className={`${getCardBackground()} text-white rounded-xl shadow-lg p-5 ${getBorderStyle()} hover:shadow-xl transition-all duration-200 relative overflow-hidden group`}
    >
      {/* Status indicator dot */}
      <div
        className={`absolute top-3 right-3 h-2 w-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'} shadow-md shadow-green-500/20 pointer-events-none`}
      ></div>

      {/* Subtle background pattern for RGB channels */}
      {isRgbChannel && (
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500 rounded-full filter blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute left-0 bottom-0 w-32 h-32 bg-indigo-500 rounded-full filter blur-3xl -ml-16 -mb-16"></div>
        </div>
      )}

      {/* Left accent bar based on channel type */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${
          !isReady
            ? 'bg-yellow-500'
            : isRgbChannel
              ? 'bg-purple-500'
              : 'bg-blue-500'
        } pointer-events-none`}
      ></div>

      {/* Channel header */}
      <div className="flex justify-between items-center mb-3 relative">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-lg truncate max-w-[120px]">
            {channel.peer_alias || channel.peer_pubkey.slice(0, 8)}
          </span>
          <button
            className="p-1 hover:bg-gray-700/70 active:bg-gray-600/70 rounded-full transition-colors relative z-10"
            onClick={(e) => {
              e.stopPropagation()
              setIsInfoModalOpen(true)
            }}
            title="Channel Information"
            type="button"
          >
            <Info size={16} />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-md ${isReady ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'} border ${isReady ? 'border-green-500/30' : 'border-yellow-500/30'}`}
          >
            {isReady ? 'Open' : 'Pending'}
          </span>
          {isPublic ? (
            <Unlock className="text-gray-400" size={14} />
          ) : (
            <Lock className="text-gray-400" size={14} />
          )}
        </div>
      </div>

      {/* Capacity section with improved styling */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-800/50">
        <div className="text-sm text-gray-400">Capacity</div>
        <div className="font-semibold flex items-center">
          {formatBitcoinAmount(channel.capacity_sat, bitcoinUnit)} {bitcoinUnit}
          {asset && (
            <div className="ml-2 flex items-center bg-gray-800/80 rounded-full px-2 py-0.5 border border-gray-700/50">
              <AssetIcon className="h-4 w-4 mr-1" ticker={asset.ticker} />
              <span className="text-xs">{asset.ticker}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bitcoin liquidity section */}
      <div className="mb-4 p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
        <div className="flex justify-between items-center mb-1">
          <div className="text-xs font-medium text-gray-400 flex items-center">
            <AssetIcon
              className="h-3.5 w-3.5 mr-1.5 text-yellow-400"
              ticker="BTC"
            />
            <span>Bitcoin Liquidity</span>
          </div>
          <div className="flex text-xs space-x-3">
            <div className="flex items-center">
              <ArrowUpRight className="mr-1 text-blue-400" size={12} />
              <span>
                {formatBitcoinAmount(
                  channel.outbound_balance_msat / 1000,
                  bitcoinUnit
                )}
              </span>
            </div>
            <div className="flex items-center">
              <ArrowDownRight className="mr-1 text-green-400" size={12} />
              <span>
                {formatBitcoinAmount(
                  channel.inbound_balance_msat / 1000,
                  bitcoinUnit
                )}
              </span>
            </div>
          </div>
        </div>
        <LiquidityBar
          localAmount={channel.outbound_balance_msat / 1000}
          remoteAmount={channel.inbound_balance_msat / 1000}
          type="bitcoin"
        />
      </div>

      {/* RGB Asset liquidity section - only show if it's an RGB channel */}
      {isRgbChannel && asset && (
        <div className="mb-4 p-2 rounded-lg bg-purple-950/20 hover:bg-purple-950/30 transition-colors border border-purple-900/30">
          <div className="flex justify-between items-center mb-1">
            <div className="text-xs font-medium text-gray-300 flex items-center">
              <AssetIcon className="h-3.5 w-3.5 mr-1" ticker={asset.ticker} />
              <span>{asset.ticker} Liquidity</span>
            </div>
            <div className="flex text-xs space-x-3">
              <div className="flex items-center">
                <ArrowUpRight className="mr-1 text-indigo-400" size={12} />
                <span>{formatAssetAmount(channel.asset_local_amount)}</span>
              </div>
              <div className="flex items-center">
                <ArrowDownRight className="mr-1 text-purple-400" size={12} />
                <span>{formatAssetAmount(channel.asset_remote_amount)}</span>
              </div>
            </div>
          </div>
          <LiquidityBar
            localAmount={channel.asset_local_amount}
            remoteAmount={channel.asset_remote_amount}
            type="asset"
          />
        </div>
      )}

      {/* Action buttons with improved styling */}
      <div className="flex space-x-2 mt-4 relative z-10">
        <button
          className="flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 transition-colors rounded-lg font-medium text-sm text-white border border-gray-700/50 shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            setIsInfoModalOpen(true)
          }}
          type="button"
        >
          Details
        </button>
        <button
          className="flex-1 py-2 px-3 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 transition-colors rounded-lg font-medium text-sm text-white shadow-sm shadow-orange-900/30"
          onClick={(e) => {
            e.stopPropagation()
            setIsModalOpen(true)
          }}
          type="button"
        >
          Close Channel
        </button>
      </div>

      {/* Subtle hover effect indicator */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 pointer-events-none"></div>

      <InfoModal
        asset={asset}
        bitcoinUnit={bitcoinUnit}
        channel={channel}
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleCloseChannel}
      >
        <p>Are you sure you want to close this channel?</p>
      </Modal>
    </div>
  )
}
