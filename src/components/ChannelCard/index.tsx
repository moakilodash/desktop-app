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
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={onConfirm}
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
      value: `${formatBitcoinAmount(channel.local_balance_msat / 1000, bitcoinUnit)} ${bitcoinUnit}`,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">Channel Information</h3>
          <button className="text-gray-400 hover:text-white" onClick={onClose}>
            <X size={24} />
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
            className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
            onClick={onClose}
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
      minimumFractionDigits: assetPrecision,
    })
  }

  return (
    <div className="bg-gray-900 text-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-lg">
            {channel.peer_alias || channel.peer_pubkey.slice(0, 8)}
          </span>
          <button
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
            onClick={() => setIsInfoModalOpen(true)}
            title="Channel Information"
          >
            <Info size={16} />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`text-xs px-2 py-1 rounded ${channel.ready ? 'bg-green-500' : 'bg-yellow-500'}`}
          >
            {channel.ready ? 'Open' : 'Pending'}
          </span>
          {channel.public ? <Unlock size={16} /> : <Lock size={16} />}
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-1">Total Capacity</div>
        <div className="text-2xl font-bold flex items-center">
          {formatBitcoinAmount(channel.capacity_sat, bitcoinUnit)} {bitcoinUnit}
          {asset && (
            <div className="ml-2 flex items-center bg-gray-700 rounded-full px-2 py-1">
              <AssetIcon className="h-5 w-5 mr-1" ticker={asset.ticker} />
              <span className="text-sm">{asset.ticker}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="flex items-center text-sm text-gray-400 mb-1">
            <ArrowUpRight className="mr-1" size={16} /> Outbound
          </div>
          <div className="font-semibold">
            {formatBitcoinAmount(
              channel.outbound_balance_msat / 1000,
              bitcoinUnit
            )}{' '}
            {bitcoinUnit}
          </div>
        </div>
        <div>
          <div className="flex items-center text-sm text-gray-400 mb-1">
            <ArrowDownRight className="mr-1" size={16} /> Inbound
          </div>
          <div className="font-semibold">
            {formatBitcoinAmount(
              channel.inbound_balance_msat / 1000,
              bitcoinUnit
            )}{' '}
            {bitcoinUnit}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-sm font-semibold mb-2">Bitcoin Liquidity</div>
          <LiquidityBar
            localAmount={channel.outbound_balance_msat / 1000}
            remoteAmount={channel.inbound_balance_msat / 1000}
            type="bitcoin"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>
              Local:{' '}
              {formatBitcoinAmount(
                channel.outbound_balance_msat / 1000,
                bitcoinUnit
              )}
            </span>
            <span>
              Remote:{' '}
              {formatBitcoinAmount(
                channel.inbound_balance_msat / 1000,
                bitcoinUnit
              )}
            </span>
          </div>
        </div>
        {channel.asset_id && (
          <div>
            <div className="text-sm font-semibold mb-2">Asset Liquidity</div>
            <LiquidityBar
              localAmount={channel.asset_local_amount}
              remoteAmount={channel.asset_remote_amount}
              type="asset"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>
                Local: {formatAssetAmount(channel.asset_local_amount)}{' '}
                {asset?.ticker}
              </span>
              <span>
                Remote: {formatAssetAmount(channel.asset_remote_amount)}{' '}
                {asset?.ticker}
              </span>
            </div>
          </div>
        )}
      </div>

      <button
        className="w-full mt-6 py-3 px-4 bg-orange-600 hover:bg-orange-700 transition-colors rounded-lg font-bold text-white"
        onClick={() => setIsModalOpen(true)}
      >
        Close Channel
      </button>

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
